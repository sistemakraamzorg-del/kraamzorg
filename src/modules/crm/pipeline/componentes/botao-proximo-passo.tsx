"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Botao } from "@/components/ui/botao";
import { ROTULO_PAPEL, type Papel } from "@/lib/auth/papeis";
import type { NumeroPipeline } from "@/lib/dados/tipos";
import { acaoTransicionar } from "../acoes";
import { estadoInicialPipeline } from "../estado-acoes";
import {
  papelProvavelmenteConfirma,
  proximoPasso,
  rotuloEstagio,
} from "../estagios";
import type { CartaoPipelineTela } from "../tipos";

/**
 * "Próximo passo" do painel de detalhes: o botão que leva o cartão para a
 * etapa seguinte da linha principal, sem depender do menu de três pontinhos.
 * Quando a passagem é de outra equipe (financeiro, coordenação), diz quem faz
 * em vez de mostrar um botão que o banco recusaria.
 */
export function BotaoProximoPasso({
  cartao,
  pipeline,
  papeis,
}: {
  cartao: CartaoPipelineTela;
  pipeline: NumeroPipeline;
  papeis: readonly Papel[];
}) {
  const [pendente, iniciar] = React.useTransition();
  const [erro, definirErro] = React.useState<string | null>(null);
  const estagio = pipeline === 1 ? cartao.estagioP1 : cartao.estagioP2;
  const passo = proximoPasso(pipeline, estagio);
  if (!passo || cartao.estadoSensivel !== "normal") return null;

  function avancar(para: string) {
    definirErro(null);
    const formulario = new FormData();
    formulario.set("oportunidadeId", cartao.oportunidadeId);
    formulario.set("pipeline", String(pipeline));
    formulario.set("para", para);
    iniciar(async () => {
      const resultado = await acaoTransicionar(
        estadoInicialPipeline,
        formulario,
      );
      if (resultado.erro) definirErro(resultado.erro);
    });
  }

  return (
    <section
      aria-label="Próximo passo"
      className="rounded-3 bg-dourado-claro mt-4 flex flex-col gap-2 p-4"
    >
      <h3 className="text-mini text-texto-2 font-medium">Próximo passo</h3>
      {passo.tipo === "proposta" ? (
        <>
          <p className="text-apoio text-texto">
            A sessão de venda aconteceu. Falta montar e enviar a proposta.
          </p>
          <Botao asChild className="w-full">
            <Link href={`/familias/${cartao.familiaId}/proposta`}>
              {passo.rotuloBotao}
            </Link>
          </Botao>
        </>
      ) : papelProvavelmenteConfirma(papeis, passo.papelMinimo, estagio) ? (
        <>
          <Botao
            className="w-full"
            disabled={pendente}
            iconeDireita={<ArrowRight aria-hidden="true" className="size-4" />}
            onClick={() => avancar(passo.estagio)}
          >
            {passo.rotuloBotao}
          </Botao>
          {erro ? (
            <p role="alert" className="text-apoio text-alerta">
              {erro}
            </p>
          ) : null}
        </>
      ) : (
        <p className="text-apoio text-texto">
          A próxima etapa é {rotuloEstagio(pipeline, passo.estagio)}. Quem
          avança essa passagem é{" "}
          {passo.papelMinimo
            ? `a equipe de ${ROTULO_PAPEL[passo.papelMinimo].toLowerCase()}`
            : "outra equipe"}
          .
        </p>
      )}
    </section>
  );
}
