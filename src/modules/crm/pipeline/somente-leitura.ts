import type { CartaoAcompanhamento } from "@/lib/dados/tipos";
import type { PosVendaItem } from "@/lib/dados/tipos-ocorrencia";
import { formatarData, localidade } from "@/lib/formatacao";
import {
  ROTULO_CLASSIFICACAO_NPS,
  ROTULO_ESTADO_ACOMPANHAMENTO,
  ROTULO_ESTAGIO_P4,
} from "./estagios";
import { haQuantoTempo, textoIdadeGestacional } from "./idade-gestacional";

/** Aba do seletor: 1 e 2 arrastam; 3 e 4 só mostram. */
export type AbaPipeline = 1 | 2 | 3 | 4;

export type TomSelo = "neutro" | "sucesso" | "aviso" | "destaque" | "sensivel";

/**
 * Cartão das abas 3 e 4 (atendimento e pós-venda): só leitura. O estágio é
 * o valor do enum do banco; o rótulo vem das constantes de `estagios.ts`.
 */
export interface CartaoSomenteLeitura {
  id: string;
  familiaId: string;
  nomeFamilia: string;
  estagio: string;
  rotuloEstagio: string;
  localidade: string | null;
  idadeGestacional: string | null;
  tempoNoEstagio: string | null;
  /** Estado sensível sério (bloqueio total ou encerrado): sem semana, nota nem palavra de venda. */
  sensivel: boolean;
  emFreio: boolean;
  linhas: { rotulo: string; valor: string }[];
  selos: { texto: string; tom: TomSelo }[];
  classificacao: PosVendaItem["classificacao"];
}

function comData(
  linhas: CartaoSomenteLeitura["linhas"],
  rotulo: string,
  data: string | null,
) {
  const valor = data ? formatarData(data) : null;
  if (valor) linhas.push({ rotulo, valor });
}

export function cartaoDeAcompanhamento(
  c: CartaoAcompanhamento,
  hoje: string,
): CartaoSomenteLeitura {
  const sensivel =
    c.estadoSensivel === "bloqueio_total" ||
    c.estadoSensivel === "encerrado_sensivel";
  const linhas: CartaoSomenteLeitura["linhas"] = [];
  comData(linhas, "Início do atendimento", c.inicioEfetivo);
  comData(linhas, "Alta prevista (estimativa)", c.previsaoAlta);
  return {
    id: c.acompanhamentoId,
    familiaId: c.familiaId,
    nomeFamilia: c.nomeFamilia,
    estagio: c.estado,
    rotuloEstagio: ROTULO_ESTADO_ACOMPANHAMENTO[c.estado],
    localidade: localidade(c.bairro, c.cidade),
    idadeGestacional: sensivel
      ? null
      : textoIdadeGestacional(c.dpp, hoje, c.dataNascimento),
    tempoNoEstagio: haQuantoTempo(c.atualizadoEm),
    sensivel,
    emFreio: c.estadoSensivel !== "normal",
    linhas,
    selos: [],
    classificacao: null,
  };
}

export function cartaoDePosVenda(p: PosVendaItem): CartaoSomenteLeitura {
  const emFreio = p.bloqueio === "freio";
  const linhas: CartaoSomenteLeitura["linhas"] = [];
  comData(linhas, "Pesquisa enviada em", p.pesquisaEnviadaEm);
  comData(linhas, "Respondida em", p.pesquisaRespondidaEm);
  if (!emFreio && p.nps !== null)
    linhas.push({ rotulo: "Nota da pesquisa", valor: String(p.nps) });
  const selos: CartaoSomenteLeitura["selos"] = [];
  if (!emFreio && p.classificacao)
    selos.push({
      texto: ROTULO_CLASSIFICACAO_NPS[p.classificacao],
      tom:
        p.classificacao === "promotor"
          ? "sucesso"
          : p.classificacao === "detrator"
            ? "aviso"
            : "neutro",
    });
  if (p.linkAtivo) selos.push({ texto: "Link ativo", tom: "neutro" });
  if (p.depoimentoAutorizado)
    selos.push({ texto: "Depoimento autorizado", tom: "neutro" });
  if (p.autorizacaoImagem)
    selos.push({ texto: "Imagem autorizada", tom: "neutro" });
  if (p.bloqueio === "nao_contatar")
    selos.push({ texto: "Não contatar", tom: "sensivel" });
  return {
    id: p.id,
    familiaId: p.familiaId,
    nomeFamilia: p.familiaNome,
    estagio: p.estagio,
    rotuloEstagio: ROTULO_ESTAGIO_P4[p.estagio],
    localidade: null,
    idadeGestacional: null,
    tempoNoEstagio: haQuantoTempo(p.criadoEm),
    sensivel: emFreio,
    emFreio,
    linhas,
    selos,
    classificacao: emFreio ? null : p.classificacao,
  };
}
