"use client";

import Link from "next/link";
import { Clock, FileText, Hourglass, OctagonPause } from "lucide-react";
import { Botao } from "@/components/ui/botao";
import {
  PainelLateral,
  PainelLateralConteudo,
} from "@/components/ui/painel-lateral";
import { LinhaGestacao } from "@/components/ui/linha-gestacao";
import { Selo } from "@/components/ui/selo";
import { formatarData, localidade } from "@/lib/formatacao";
import type { NumeroPipeline } from "@/lib/dados/tipos";
import { ROTULO_ORIGEM_LEAD, rotuloEstagio } from "../estagios";
import { calcularIdadeGestacional, hojeBrasilia } from "../idade-gestacional";
import type { CartaoPipelineTela } from "../tipos";

export const ROTULO_CLASSIFICACAO = {
  quente: "Quente",
  morno: "Morno",
  frio: "Frio",
} as const;

export const EXPLICA_CLASSIFICACAO = {
  quente:
    "Quente: pontuação alta, a família está pronta para conversar sobre a contratação.",
  morno: "Morno: pontuação intermediária, vale manter o contato e acompanhar.",
  frio: "Frio: pontuação baixa, ainda sem sinais de que vai contratar agora.",
} as const;

function Linha({
  rotulo,
  children,
}: {
  rotulo: string;
  children: React.ReactNode;
}) {
  return (
    <div className="border-linha flex flex-col gap-0.5 border-b py-3 last:border-b-0">
      <dt className="text-mini text-texto-2">{rotulo}</dt>
      <dd className="text-texto">{children}</dd>
    </div>
  );
}

/** Painel de detalhes do cartão (abre ao clicar). Só dados que o cartão já tem. */
export function DetalheOportunidade({
  cartao,
  pipeline,
  aoFechar,
}: {
  cartao: CartaoPipelineTela | null;
  pipeline: NumeroPipeline;
  aoFechar: () => void;
}) {
  const estagio = cartao
    ? pipeline === 1
      ? cartao.estagioP1
      : cartao.estagioP2
    : null;
  const sensivel =
    cartao?.estadoSensivel === "bloqueio_total" ||
    cartao?.estadoSensivel === "encerrado_sensivel";
  const emFreio = !!cartao && cartao.estadoSensivel !== "normal";
  // Linha da gestação (saiu do cartão compacto); some em estado sensível e
  // depois do nascimento.
  const ig =
    cartao && !sensivel && cartao.dpp && !cartao.dataNascimento
      ? calcularIdadeGestacional(cartao.dpp, hojeBrasilia())
      : null;

  return (
    <PainelLateral
      open={cartao !== null}
      onOpenChange={(a) => !a && aoFechar()}
    >
      {cartao ? (
        <PainelLateralConteudo
          titulo={cartao.nomeFamilia}
          descricao="Resumo da oportunidade. A ficha completa tem o histórico inteiro."
          rotuloFechar="Fechar detalhes"
        >
          <dl>
            <Linha rotulo="Estágio">
              {estagio ? rotuloEstagio(pipeline, estagio) : "Sem estágio"}
              <span className="text-apoio text-texto-2">
                {" "}
                (
                {cartao.tempoNoEstagio === "Hoje"
                  ? "desde hoje"
                  : cartao.tempoNoEstagio.charAt(0).toLowerCase() +
                    cartao.tempoNoEstagio.slice(1)}
                )
              </span>
            </Linha>
            {!sensivel && cartao.idadeGestacional ? (
              <Linha rotulo="Idade gestacional">
                <span className="font-mono">{cartao.idadeGestacional}</span>
              </Linha>
            ) : null}
            {cartao && ig && ig.semanas <= 42 && cartao.dpp ? (
              <Linha rotulo="Linha da gestação">
                <LinhaGestacao
                  semanas={ig.semanas}
                  dias={ig.dias}
                  dpp={formatarData(cartao.dpp) ?? ""}
                  semLegenda
                />
              </Linha>
            ) : null}
            {cartao.dpp ? (
              <Linha rotulo="DPP (data provável do parto, é uma estimativa)">
                <span className="font-mono">{formatarData(cartao.dpp)}</span>
              </Linha>
            ) : null}
            {localidade(cartao.bairro, cartao.cidade) ? (
              <Linha rotulo="Região">
                {localidade(cartao.bairro, cartao.cidade)}
              </Linha>
            ) : null}
            {cartao.origem ? (
              <Linha rotulo="Origem">{ROTULO_ORIGEM_LEAD[cartao.origem]}</Linha>
            ) : null}
            {!sensivel && cartao.score !== null ? (
              <Linha rotulo="Pontuação">
                <span className="font-mono">{cartao.score}</span>
                {cartao.classificacao ? (
                  <span className="text-apoio text-texto-2">
                    {" "}
                    · {EXPLICA_CLASSIFICACAO[cartao.classificacao]}
                  </span>
                ) : null}
              </Linha>
            ) : null}
            <Linha rotulo="Situação">
              <span className="flex flex-wrap gap-1.5">
                {!sensivel && cartao.classificacao ? (
                  <Selo
                    variante={
                      cartao.classificacao === "quente" ? "destaque" : "neutro"
                    }
                  >
                    {ROTULO_CLASSIFICACAO[cartao.classificacao]}
                  </Selo>
                ) : null}
                {cartao.pdfEnviadoEm ? (
                  <Selo icone={<FileText aria-hidden="true" />}>
                    Apresentação enviada em {formatarData(cartao.pdfEnviadoEm)}
                  </Selo>
                ) : null}
                {cartao.transferenciaAberta ? (
                  <Selo
                    variante="aviso"
                    icone={<Hourglass aria-hidden="true" />}
                  >
                    Transferência aberta
                  </Selo>
                ) : null}
                {emFreio ? (
                  <Selo
                    variante="sensivel"
                    icone={<OctagonPause aria-hidden="true" />}
                  >
                    Freio ativo
                  </Selo>
                ) : null}
                {!cartao.pdfEnviadoEm &&
                !cartao.transferenciaAberta &&
                !emFreio &&
                (sensivel || !cartao.classificacao) ? (
                  <span className="text-apoio text-texto-2">
                    Nada em andamento.
                  </span>
                ) : null}
              </span>
            </Linha>
            {!emFreio && cartao.proximoContatoEm ? (
              <Linha rotulo="Próxima ação">
                <span className="flex items-start gap-2">
                  <Clock aria-hidden="true" className="mt-1 size-4 shrink-0" />
                  Contato em {formatarData(cartao.proximoContatoEm)}.
                </span>
              </Linha>
            ) : null}
            {emFreio ? (
              <Linha rotulo="Mensagens">
                <span className="text-sensivel">
                  {sensivel
                    ? "Nenhuma mensagem automática sai para esta família."
                    : "Conteúdo e marketing pausados; os avisos da operação continuam."}
                </span>
              </Linha>
            ) : null}
          </dl>
          <Botao asChild className="mt-4 w-full">
            <Link href={`/familias/${cartao.familiaId}`}>
              Abrir ficha completa
            </Link>
          </Botao>
        </PainelLateralConteudo>
      ) : null}
    </PainelLateral>
  );
}
