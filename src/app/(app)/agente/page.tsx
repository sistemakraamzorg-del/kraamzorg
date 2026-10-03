import type { Metadata } from "next";
import Link from "next/link";
import { z } from "zod";
import { CabecalhoTela } from "@/components/shell/cabecalho-tela";
import { AbasPilula } from "@/components/ui/abas-pilula";
import { Botao } from "@/components/ui/botao";
import { FaixaAlerta } from "@/components/ui/faixa-alerta";
import { exigirSessao } from "@/lib/auth/sessao";
import { listarConversasTela } from "@/modules/agente/conversas/dados";
import { obterConversaTela } from "@/modules/agente/conversa-detalhe/dados";
import type { ConversaDetalheTela } from "@/modules/agente/conversa-detalhe/dados";
import { listarFilaTela } from "@/modules/agente/transferencias/dados";
import type {
  ConversaComPausa,
  TransferenciaTela,
} from "@/modules/agente/tipos";
import { obterBaseConhecimentoTela } from "@/modules/agente/base-conhecimento/dados";
import { PainelBaseConhecimento } from "@/modules/agente/base-conhecimento/componentes/painel-base-conhecimento";
import {
  obterLimiarAmostra,
  obterMetricasTela,
  periodoPadrao,
} from "@/modules/agente/metricas/dados";
import { obterRegraRetomadaTela } from "@/modules/agente/regras-retomada/dados";
import { PainelRegraRetomada } from "@/modules/agente/regras-retomada/componentes/painel-regra-retomada";
import {
  AbaConversas,
  AbaHandoffs,
  AbaLimites,
  AbaMetricas,
  AbaSolicitacoes,
} from "@/modules/agente/abas/abas-isadora";

export const metadata: Metadata = { title: "Isadora · Kraamzorg OS" };

const ABAS = [
  "conversas",
  "handoffs",
  "solicitacoes",
  "metricas",
  "limites",
] as const;
type Aba = (typeof ABAS)[number];

const sucesso = <T,>(v: T) => ({ ok: true as const, v });
const falha = () => ({ ok: false as const, v: null });

/**
 * Tela da Isadora (P27; PRD 11) nas abas do HTML da cliente: Conversas,
 * Handoffs, Solicitações, Métricas, Limites e FAQs. A aba mora na URL
 * (`?aba=`). [v4.5] O modo, a lista de teste, as pausas e a janela de
 * retomada são parâmetros do agente, mantidos pela equipe de implantação.
 * A pausa e o "devolver à Isadora" ficam na conversa, e a fila completa em
 * `/conversas?filtro=esperando`. Dono: P27.
 */
export default async function PaginaAgente({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sessao = await exigirSessao("/agente");
  const ehDiretoria = sessao.papeis.includes("diretoria");
  const pesquisa = await searchParams;
  const bruto = Array.isArray(pesquisa.aba) ? pesquisa.aba[0] : pesquisa.aba;
  const aba: Aba = ABAS.find((a) => a === bruto) ?? "conversas";
  const pedida = Array.isArray(pesquisa.c) ? pesquisa.c[0] : pesquisa.c;

  const [conversasR, filaR] = await Promise.all([
    listarConversasTela().then(
      (v) => sucesso<ConversaComPausa[]>(v),
      () => ({ ok: false as const, v: null as ConversaComPausa[] | null }),
    ),
    listarFilaTela().then(
      (v) => sucesso<TransferenciaTela[]>(v),
      () => ({ ok: false as const, v: null as TransferenciaTela[] | null }),
    ),
  ]);
  const conversas = conversasR.v;
  const fila = filaR.v;
  const contar = (s: ConversaComPausa["situacao"]) =>
    conversas ? conversas.filter((c) => c.situacao === s).length : null;
  const recentes = (conversas ?? [])
    .filter((c) => c.situacao !== "nao_lead")
    .sort((a, b) =>
      (b.ultimaEntradaEm ?? b.ultimaSaidaEm ?? "").localeCompare(
        a.ultimaEntradaEm ?? a.ultimaSaidaEm ?? "",
      ),
    )
    .slice(0, 12);

  let selecionadaId: string | null = null;
  let detalhe: ConversaDetalheTela | null = null;
  if (aba === "conversas" && recentes.length > 0) {
    const valida =
      pedida && z.uuid().safeParse(pedida).success
        ? recentes.find((c) => c.id === pedida)
        : undefined;
    selecionadaId = (valida ?? recentes[0])?.id ?? null;
    if (selecionadaId)
      detalhe = await obterConversaTela(selecionadaId).catch(() => null);
  }

  let painel: React.ReactNode = null;
  let faltouAlgo = !conversasR.ok || !filaR.ok;

  if (aba === "metricas") {
    const [metricasR, limiar] = await Promise.all([
      (async () => {
        const { desde, ate } = periodoPadrao();
        return obterMetricasTela(desde, ate);
      })().then(sucesso, falha),
      obterLimiarAmostra().catch(() => null),
    ]);
    painel = (
      <AbaMetricas
        contadores={{
          esperando: fila ? fila.length : null,
          isadora: contar("isadora"),
          equipe: contar("equipe"),
          pausada: contar("pausada"),
        }}
        metricas={metricasR.v}
        limiarAmostra={limiar}
      />
    );
  } else if (aba === "limites") {
    const [regraR, baseR] = await Promise.all([
      obterRegraRetomadaTela().then(sucesso, falha),
      obterBaseConhecimentoTela().then(sucesso, falha),
    ]);
    const vazio = (t: string) => (
      <p className="text-tinta-50 text-[12.5px]">{t}</p>
    );
    painel = (
      <AbaLimites
        ajustes={
          <p className="text-tinta-70 text-[12.5px] leading-[1.6]">
            Quando ela responde, a lista de teste, as pausas, a retomada e a
            agenda são ajustes feitos pela equipe de implantação, fora do
            aplicativo, para a Isadora nunca falar com uma família por um número
            trocado sem querer. Para pedir uma mudança, fale com a equipe de
            implantação.
          </p>
        }
        retomada={
          <div className="flex flex-col gap-3">
            <p className="text-tinta-50 text-[11.5px]">
              A Isadora manda uma única mensagem de retomada. D+3 e D+14
              continuam como tarefa humana.
            </p>
            {regraR.v ? (
              <PainelRegraRetomada regra={regraR.v} />
            ) : (
              vazio("Não foi possível carregar esta regra agora.")
            )}
          </div>
        }
        base={
          baseR.v ? (
            <PainelBaseConhecimento base={baseR.v} podeAprovar={ehDiretoria} />
          ) : (
            vazio("Não foi possível carregar a base agora.")
          )
        }
      />
    );
  } else if (aba === "handoffs") {
    painel = <AbaHandoffs fila={fila} />;
  } else if (aba === "solicitacoes") {
    painel = <AbaSolicitacoes />;
    faltouAlgo = false;
  } else {
    painel = (
      <AbaConversas
        conversas={recentes.length > 0 ? recentes : conversas}
        selecionadaId={selecionadaId}
        detalhe={detalhe}
      />
    );
  }

  return (
    <>
      <CabecalhoTela
        sobretitulo="Atendimento"
        titulo="Isadora"
        subtitulo="Quem espera uma resposta da equipe e como estão as conversas."
        lateral={
          <Botao asChild tamanho="compacto">
            <Link href="/conversas?filtro=esperando">Ver quem espera</Link>
          </Botao>
        }
      />
      <div className="flex flex-col gap-3.5 pt-5">
        {faltouAlgo ? (
          <FaixaAlerta variante="erro" titulo="Alguma parte não carregou agora">
            Confira a conexão e recarregue a página. Se continuar, avise a
            equipe técnica.
          </FaixaAlerta>
        ) : null}
        <AbasPilula
          rotulo="Seções da Isadora"
          ativa={aba}
          larga="celular"
          abas={[
            {
              valor: "conversas",
              rotulo: "Conversas",
              href: "/agente?aba=conversas",
            },
            {
              valor: "handoffs",
              rotulo: "Handoffs",
              href: "/agente?aba=handoffs",
              contador: fila ? fila.length : undefined,
            },
            {
              valor: "solicitacoes",
              rotulo: "Solicitações",
              href: "/agente?aba=solicitacoes",
            },
            {
              valor: "metricas",
              rotulo: "Métricas",
              href: "/agente?aba=metricas",
            },
            {
              valor: "limites",
              rotulo: "Limites e FAQs",
              href: "/agente?aba=limites",
            },
          ]}
        />
        {painel}
      </div>
    </>
  );
}
