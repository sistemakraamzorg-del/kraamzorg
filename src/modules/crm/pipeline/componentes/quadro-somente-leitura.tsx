"use client";

import * as React from "react";
import Link from "next/link";
import { OctagonPause } from "lucide-react";
import { FolhaLupa } from "@/components/ilustracoes";
import { Botao } from "@/components/ui/botao";
import { Cartao } from "@/components/ui/cartao";
import { EstadoVazio } from "@/components/ui/estado-vazio";
import { FaixaAlerta } from "@/components/ui/faixa-alerta";
import {
  PainelLateral,
  PainelLateralConteudo,
} from "@/components/ui/painel-lateral";
import { Selo } from "@/components/ui/selo";
import type { CartaoSomenteLeitura } from "../somente-leitura";

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
        className="-mx-4 flex snap-x snap-mandatory items-start gap-3 overflow-x-auto px-4 pt-3 pb-3 lg:mx-0 lg:px-0"
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
              className="rounded-3 border-linha bg-areia-clara shadow-1 flex min-h-40 w-[17.5rem] flex-none snap-start flex-col gap-3 border p-3 lg:w-[19rem]"
            >
              <div className="flex min-h-10 items-center gap-2 pl-1">
                <span
                  aria-hidden="true"
                  className="bg-dourado size-2.5 flex-none rounded-full"
                />
                <h2
                  id={`titulo-${coluna.estagio}`}
                  className="font-titulo text-3 min-w-0 flex-1 truncate font-medium"
                >
                  {coluna.rotulo}
                </h2>
                <span
                  tabIndex={0}
                  aria-label={dica}
                  title={dica}
                  className="rounded-pilula bg-superficie text-apoio border-linha inline-flex min-h-8 min-w-8 items-center justify-center border px-2 font-mono font-medium"
                >
                  {n}
                </span>
              </div>
              {n === 0 ? (
                <p className="text-apoio text-texto-2 px-2 pb-2">
                  Nenhuma família neste estágio agora.
                </p>
              ) : null}
              <div className="flex flex-col gap-3">
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
              <Linha rotulo="Estágio">{detalhe.rotuloEstagio}</Linha>
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
  return (
    <Cartao
      variante="plano"
      onClick={(e) => {
        if (!(e.target as HTMLElement).closest("button, a")) aoAbrir();
      }}
      className={`shadow-1 hover:shadow-2 cursor-pointer motion-safe:transition-shadow motion-safe:duration-140 ${
        cartao.emFreio ? "bg-sensivel-lavado border-sensivel-borda border" : ""
      }`}
    >
      <div className="flex flex-col gap-2">
        <button
          type="button"
          onClick={aoAbrir}
          aria-label={`Ver detalhes de ${cartao.nomeFamilia}`}
          className="font-titulo text-3 min-h-toque inline-flex items-center text-left font-medium underline-offset-4 hover:underline"
        >
          {cartao.nomeFamilia}
        </button>
        <p className="text-apoio text-texto-2 flex flex-wrap gap-x-3 gap-y-0.5">
          {cartao.idadeGestacional ? (
            <span className="font-mono">{cartao.idadeGestacional}</span>
          ) : null}
          {cartao.localidade ? <span>{cartao.localidade}</span> : null}
        </p>
        {cartao.linhas.map((l) => (
          <p key={l.rotulo} className="text-mini text-texto-2">
            {l.rotulo}: <span className="font-mono">{l.valor}</span>
          </p>
        ))}
        {cartao.tempoNoEstagio ? (
          <p className="text-mini text-texto-2">
            Neste estágio{" "}
            {cartao.tempoNoEstagio === "Hoje"
              ? "desde hoje"
              : cartao.tempoNoEstagio.charAt(0).toLowerCase() +
                cartao.tempoNoEstagio.slice(1)}
          </p>
        ) : null}
        {cartao.selos.length > 0 || cartao.emFreio ? (
          <div className="flex flex-wrap gap-1.5">
            {cartao.selos.map((s) => (
              <Selo key={s.texto} variante={s.tom}>
                {s.texto}
              </Selo>
            ))}
            {cartao.emFreio ? (
              <Selo
                variante="sensivel"
                icone={<OctagonPause aria-hidden="true" />}
              >
                Freio ativo
              </Selo>
            ) : null}
          </div>
        ) : null}
      </div>
    </Cartao>
  );
}
