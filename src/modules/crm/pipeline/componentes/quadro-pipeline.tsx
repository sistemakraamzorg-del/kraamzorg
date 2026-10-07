"use client";

import * as React from "react";
import { FolhaLupa } from "@/components/ilustracoes";
import { EstadoVazio } from "@/components/ui/estado-vazio";
import { FaixaAlerta } from "@/components/ui/faixa-alerta";
import type { Papel } from "@/lib/auth/papeis";
import type { NumeroPipeline } from "@/lib/dados/tipos";
import { acaoTransicionar } from "../acoes";
import { estadoInicialPipeline } from "../estado-acoes";
import { ORDEM_P1, ORDEM_P2, rotuloEstagio } from "../estagios";
import type { CartaoPipelineTela } from "../tipos";
import { CartaoOportunidadePipeline } from "./cartao-oportunidade";
import { DetalheOportunidade } from "./detalhe-oportunidade";
import { FolhaPerda } from "./folha-perda";
import { FolhaSaidaIntercorrencia } from "./folha-saida-intercorrencia";
import { decidirSoltar } from "./soltar";
import { CLASSE_COLUNA, CLASSE_QUADRO, CabecalhoColuna } from "./visual-quadro";

type Estagio = (typeof ORDEM_P1)[number] | (typeof ORDEM_P2)[number];

/**
 * Quadro kanban do pipeline: colunas por estágio, cartões arrastáveis
 * (API nativa de arrastar e soltar) e o menu "Mover para" como alternativa
 * para toque e teclado. Soltar usa a mesma ação do menu (`acaoTransicionar`,
 * que passa por `privado.transicionar`), com atualização otimista que volta
 * atrás se o banco recusar. "Perdido" e sair de intercorrência abrem as
 * mesmas folhas do menu.
 */
export function QuadroPipeline({
  pipeline,
  cartoes,
  papeis,
}: {
  pipeline: NumeroPipeline;
  cartoes: CartaoPipelineTela[];
  papeis: readonly Papel[];
}) {
  const ordem = pipeline === 1 ? ORDEM_P1 : ORDEM_P2;
  const campo = pipeline === 1 ? "estagioP1" : "estagioP2";
  // Estágio mostrado enquanto a ação ainda não voltou (otimista).
  const [otimista, definirOtimista] = React.useState<Record<string, Estagio>>(
    {},
  );
  const [arrastando, definirArrastando] = React.useState<{
    id: string;
    origem: Estagio;
  } | null>(null);
  const [alvo, definirAlvo] = React.useState<Estagio | null>(null);
  const [detalheId, definirDetalheId] = React.useState<string | null>(null);
  const [aviso, definirAviso] = React.useState<string | null>(null);
  const [perda, definirPerda] = React.useState<CartaoPipelineTela | null>(null);
  const [saida, definirSaida] = React.useState<{
    cartao: CartaoPipelineTela;
    para: Estagio;
  } | null>(null);
  const [, iniciarTransicao] = React.useTransition();

  // Chegou dado novo do servidor: o otimista cumpriu o papel.
  const [vistos, definirVistos] = React.useState(cartoes);
  if (vistos !== cartoes) {
    definirVistos(cartoes);
    definirOtimista({});
  }

  const efetivos = cartoes.map((c) =>
    otimista[c.oportunidadeId]
      ? { ...c, [campo]: otimista[c.oportunidadeId] }
      : c,
  ) as CartaoPipelineTela[];

  const detalhe = efetivos.find((c) => c.oportunidadeId === detalheId) ?? null;
  const total = efetivos.length;

  const grupos = ordem.map((estagio) => ({
    estagio,
    rotulo: rotuloEstagio(pipeline, estagio),
    cartoes: efetivos.filter((c) => c[campo] === estagio),
  }));

  function aoSoltar(destino: Estagio) {
    const em = arrastando;
    definirArrastando(null);
    definirAlvo(null);
    if (!em) return;
    const cartao = efetivos.find((c) => c.oportunidadeId === em.id);
    if (!cartao) return;
    const decisao = decidirSoltar(pipeline, em.origem, destino);
    if (decisao.tipo === "nada") return;
    if (decisao.tipo === "recusado") {
      definirAviso(
        "Esse passo não existe a partir desse estágio. A família ficou onde estava.",
      );
      return;
    }
    definirAviso(null);
    if (decisao.tipo === "perda") return definirPerda(cartao);
    if (decisao.tipo === "saida_intercorrencia")
      return definirSaida({ cartao, para: decisao.para });

    definirOtimista((o) => ({ ...o, [em.id]: decisao.para }));
    const formulario = new FormData();
    formulario.set("oportunidadeId", em.id);
    formulario.set("pipeline", String(pipeline));
    formulario.set("para", decisao.para);
    iniciarTransicao(async () => {
      try {
        const resultado = await acaoTransicionar(
          estadoInicialPipeline,
          formulario,
        );
        if (resultado.erro) throw new Error(resultado.erro);
      } catch (erro) {
        definirOtimista((o) => {
          const { [em.id]: _, ...resto } = o;
          return resto;
        });
        definirAviso(
          erro instanceof Error && erro.message
            ? erro.message
            : "Não foi possível mover a família agora. Ela voltou para onde estava.",
        );
      }
    });
  }

  if (cartoes.length === 0) {
    return (
      <EstadoVazio
        nivelTitulo="h2"
        ilustracao={<FolhaLupa tamanho={112} />}
        titulo="Nenhuma família com esses filtros"
        texto="Troque os filtros ou a busca. Se a lista inteira está vazia, o pipeline ainda não tem nenhuma família neste estágio."
      />
    );
  }

  return (
    <>
      {aviso ? (
        <div className="pt-2">
          <FaixaAlerta variante="erro" titulo={aviso} />
        </div>
      ) : null}
      <div
        className={CLASSE_QUADRO}
        role="region"
        aria-label={`Estágios do pipeline ${pipeline === 1 ? "de entrada" : "de venda"}. Arraste um cartão para outra coluna ou use o botão Mover para.`}
        tabIndex={0}
      >
        {grupos.map((grupo) => {
          const permitido =
            arrastando !== null &&
            decidirSoltar(pipeline, arrastando.origem, grupo.estagio).tipo !==
              "recusado" &&
            arrastando.origem !== grupo.estagio;
          const n = grupo.cartoes.length;
          const por = (k: string) =>
            grupo.cartoes.filter((c) => c.classificacao === k).length;
          const dica =
            `${n === 1 ? "1 família" : `${n} famílias`}, ${total ? Math.round((n / total) * 100) : 0}% do funil.` +
            (n
              ? ` ${por("quente")} ${por("quente") === 1 ? "quente" : "quentes"}, ${por("morno")} ${por("morno") === 1 ? "morna" : "mornas"}, ${por("frio")} ${por("frio") === 1 ? "fria" : "frias"}.`
              : "");
          const destacado = alvo === grupo.estagio && permitido;
          return (
            <section
              key={grupo.estagio}
              aria-labelledby={`titulo-${grupo.estagio}`}
              onDragOver={(e) => {
                if (!arrastando) return;
                if (permitido) e.preventDefault();
                if (alvo !== grupo.estagio) definirAlvo(grupo.estagio);
              }}
              onDragLeave={(e) => {
                if (!e.currentTarget.contains(e.relatedTarget as Node | null))
                  definirAlvo((a) => (a === grupo.estagio ? null : a));
              }}
              onDrop={(e) => {
                e.preventDefault();
                aoSoltar(grupo.estagio);
              }}
              className={`${CLASSE_COLUNA} motion-safe:transition-[box-shadow,opacity] motion-safe:duration-140 ${
                destacado ? "border-dourado bg-dourado-claro" : ""
              } ${arrastando && !permitido && arrastando.origem !== grupo.estagio ? "opacity-60" : ""}`}
            >
              <CabecalhoColuna
                id={`titulo-${grupo.estagio}`}
                estagio={grupo.estagio}
                rotulo={grupo.rotulo}
                contagem={n}
                dica={dica}
              />
              {grupo.cartoes.length === 0 ? (
                <p className="text-tinta-50 px-1 pb-2 text-[11.5px]">
                  {destacado
                    ? "Solte aqui para mover."
                    : "Nenhuma família neste estágio agora."}
                </p>
              ) : null}
              <div className="flex min-h-0 flex-col gap-2 overflow-y-auto overscroll-contain lg:max-h-[calc(100dvh-22rem)]">
                {grupo.cartoes.map((cartao) => (
                  <div
                    key={cartao.oportunidadeId}
                    draggable
                    onDragStart={(e) => {
                      e.dataTransfer.effectAllowed = "move";
                      e.dataTransfer.setData(
                        "text/plain",
                        cartao.oportunidadeId,
                      );
                      definirAviso(null);
                      definirArrastando({
                        id: cartao.oportunidadeId,
                        origem: grupo.estagio,
                      });
                    }}
                    onDragEnd={() => {
                      definirArrastando(null);
                      definirAlvo(null);
                    }}
                    className={`cursor-grab active:cursor-grabbing ${
                      arrastando?.id === cartao.oportunidadeId
                        ? "shadow-2 opacity-50 motion-safe:scale-[1.02]"
                        : ""
                    } motion-safe:transition-transform`}
                  >
                    <CartaoOportunidadePipeline
                      cartao={cartao}
                      pipeline={pipeline}
                      papeis={papeis}
                      aoAbrir={() => definirDetalheId(cartao.oportunidadeId)}
                    />
                  </div>
                ))}
              </div>
            </section>
          );
        })}
      </div>
      <DetalheOportunidade
        cartao={detalhe}
        pipeline={pipeline}
        aoFechar={() => definirDetalheId(null)}
      />
      {perda ? (
        <FolhaPerda
          aberta
          aoFechar={() => definirPerda(null)}
          oportunidadeId={perda.oportunidadeId}
          pipeline={pipeline}
          nomeFamilia={perda.nomeFamilia}
        />
      ) : null}
      {saida ? (
        <FolhaSaidaIntercorrencia
          aberta
          aoFechar={() => definirSaida(null)}
          oportunidadeId={saida.cartao.oportunidadeId}
          pipeline={pipeline}
          destinoEstagio={saida.para}
          destinoRotulo={rotuloEstagio(pipeline, saida.para as never)}
          nomeFamilia={saida.cartao.nomeFamilia}
        />
      ) : null}
    </>
  );
}
