"use client";

import * as React from "react";
import Link from "next/link";
import { OctagonPause } from "lucide-react";
import { FolhaLupa } from "@/components/ilustracoes";
import { Botao } from "@/components/ui/botao";
import { EstadoVazio } from "@/components/ui/estado-vazio";
import { FaixaAlerta } from "@/components/ui/faixa-alerta";
import {
  PainelLateral,
  PainelLateralConteudo,
} from "@/components/ui/painel-lateral";
import { Selo } from "@/components/ui/selo";
import type { CartaoSomenteLeitura } from "../somente-leitura";
import {
  CLASSE_CARTAO,
  CLASSE_COLUNA,
  CLASSE_QUADRO,
  CLASSE_RODAPE,
  CabecalhoColuna,
  ETIQUETA_MIUDA,
} from "./visual-quadro";

/**
 * Quadro das abas 3 (atendimento) e 4 (pós-venda): colunas por estágio
 * sem arrastar, porque esses estágios mudam por registros e automações,
 * nunca por update direto (PRD 7). O cartão abre um resumo e leva à ficha.
 */
export function QuadroSomenteLeitura({
  colunas,
  cartoes,
  nomeAba,
}: {
  colunas: readonly { estagio: string; rotulo: string }[];
  cartoes: CartaoSomenteLeitura[];
  nomeAba: string;
}) {
  const [aberto, definirAberto] = React.useState<string | null>(null);
  const detalhe = cartoes.find((c) => c.id === aberto) ?? null;
  const total = cartoes.length;

  if (total === 0) {
    return (
      <EstadoVazio
        nivelTitulo="h2"
        ilustracao={<FolhaLupa tamanho={112} />}
        titulo="Nenhuma família com esses filtros"
        texto="Troque a busca ou a região. Se a lista inteira está vazia, ainda não há família neste pipeline."
      />
    );
  }

  return (
    <>
      <FaixaAlerta variante="info" titulo="Somente leitura">
        Estes estágios mudam por registros e automações, não por arrastar.
      </FaixaAlerta>
      <div
        className={`${CLASSE_QUADRO} pt-3 lg:pt-1`}
        role="region"
        aria-label={`Estágios de ${nomeAba}, somente leitura.`}
        tabIndex={0}
      >
        {colunas.map((coluna) => {
          const itens = cartoes.filter((c) => c.estagio === coluna.estagio);
          const n = itens.length;
          const dica = `${n === 1 ? "1 família" : `${n} famílias`}, ${Math.round((n / total) * 100)}% do total.`;
          return (
            <section
              key={coluna.estagio}
              aria-labelledby={`titulo-${coluna.estagio}`}
              className={CLASSE_COLUNA}
            >
              <CabecalhoColuna
                id={`titulo-${coluna.estagio}`}
                estagio={coluna.estagio}
                rotulo={coluna.rotulo}
                contagem={n}
                dica={dica}
              />
              {n === 0 ? (
                <p className="text-tinta-50 px-1 pb-2 text-[11.5px]">
                  Nenhuma família neste estágio agora.
                </p>
              ) : null}
              <div className="flex min-h-0 flex-col gap-2 overflow-y-auto overscroll-contain lg:max-h-[calc(100dvh-22rem)]">
                {itens.map((c) => (
                  <CartaoLeitura
                    key={c.id}
                    cartao={c}
                    aoAbrir={() => definirAberto(c.id)}
                  />
                ))}
              </div>
            </section>
          );
        })}
      </div>
      <PainelLateral
        open={detalhe !== null}
        onOpenChange={(a) => !a && definirAberto(null)}
      >
        {detalhe ? (
          <PainelLateralConteudo
            titulo={detalhe.nomeFamilia}
            descricao="Resumo. A ficha completa tem o histórico inteiro."
            rotuloFechar="Fechar detalhes"
          >
            <dl>
              <Linha rotulo="Estágio">
                {detalhe.rotuloEstagio}
                {detalhe.tempoNoEstagio ? (
                  <span className="text-apoio text-texto-2">
                    {" "}
                    (
                    {detalhe.tempoNoEstagio === "Hoje"
                      ? "desde hoje"
                      : detalhe.tempoNoEstagio.charAt(0).toLowerCase() +
                        detalhe.tempoNoEstagio.slice(1)}
                    )
                  </span>
                ) : null}
              </Linha>
              {detalhe.selos.length > 0 ? (
                <Linha rotulo="Situação">
                  <span className="flex flex-wrap gap-1.5">
                    {detalhe.selos.map((s) => (
                      <Selo key={s.texto} variante={s.tom}>
                        {s.texto}
                      </Selo>
                    ))}
                  </span>
                </Linha>
              ) : null}
              {detalhe.idadeGestacional ? (
                <Linha rotulo="Situação da gestação">
                  <span className="font-mono">{detalhe.idadeGestacional}</span>
                </Linha>
              ) : null}
              {detalhe.localidade ? (
                <Linha rotulo="Região">{detalhe.localidade}</Linha>
              ) : null}
              {detalhe.linhas.map((l) => (
                <Linha key={l.rotulo} rotulo={l.rotulo}>
                  {l.valor}
                </Linha>
              ))}
              {detalhe.emFreio ? (
                <Linha rotulo="Mensagens">
                  <span className="text-sensivel">
                    {detalhe.sensivel
                      ? "Nenhuma mensagem automática sai para esta família."
                      : "Conteúdo e marketing pausados; os avisos da operação continuam."}
                  </span>
                </Linha>
              ) : null}
            </dl>
            <Botao asChild className="mt-4 w-full">
              <Link href={`/familias/${detalhe.familiaId}`}>
                Abrir ficha completa
              </Link>
            </Botao>
          </PainelLateralConteudo>
        ) : null}
      </PainelLateral>
    </>
  );
}

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

function CartaoLeitura({
  cartao,
  aoAbrir,
}: {
  cartao: CartaoSomenteLeitura;
  aoAbrir: () => void;
}) {
  // Detalhes que saíram do cartão: ficam na dica e no painel.
  const dica = [
    ...cartao.linhas.map((l) => `${l.rotulo}: ${l.valor}`),
    cartao.tempoNoEstagio
      ? `Neste estágio ${
          cartao.tempoNoEstagio === "Hoje"
            ? "desde hoje"
            : cartao.tempoNoEstagio.charAt(0).toLowerCase() +
              cartao.tempoNoEstagio.slice(1)
        }`
      : null,
    ...cartao.selos.slice(1).map((s) => s.texto),
  ]
    .filter(Boolean)
    .join(". ");
  const selo = cartao.selos[0];
  return (
    <div
      title={dica || undefined}
      onClick={(e) => {
        if (!(e.target as HTMLElement).closest("button, a")) aoAbrir();
      }}
      className={`${CLASSE_CARTAO} cursor-pointer ${
        cartao.emFreio ? "bg-sensivel-lavado border-sensivel-borda" : ""
      }`}
    >
      <button
        type="button"
        onClick={aoAbrir}
        aria-label={`Ver detalhes de ${cartao.nomeFamilia}`}
        className="min-h-toque inline-flex w-full items-center truncate text-left text-[12.5px] font-semibold underline-offset-4 hover:underline lg:min-h-6"
      >
        <span className="truncate">{cartao.nomeFamilia}</span>
      </button>
      {cartao.idadeGestacional || cartao.localidade ? (
        <p className="text-tinta-50 mt-[3px] flex flex-wrap gap-1.5 text-[11px]">
          {cartao.idadeGestacional ? (
            <span className="font-mono">{cartao.idadeGestacional}</span>
          ) : null}
          {cartao.idadeGestacional && cartao.localidade ? (
            <span aria-hidden="true">·</span>
          ) : null}
          {cartao.localidade ? <span>{cartao.localidade}</span> : null}
        </p>
      ) : null}
      {selo || cartao.emFreio ? (
        <div className={CLASSE_RODAPE}>
          {selo ? (
            <Selo
              key={selo.texto}
              variante={selo.tom}
              className={ETIQUETA_MIUDA}
            >
              {selo.texto}
            </Selo>
          ) : null}
          {cartao.emFreio ? (
            <Selo
              variante="sensivel"
              icone={<OctagonPause aria-hidden="true" />}
              className={ETIQUETA_MIUDA}
            >
              Freio ativo
            </Selo>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
