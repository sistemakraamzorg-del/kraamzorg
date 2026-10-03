import Link from "next/link";
import { SlidersHorizontal } from "lucide-react";
import { Botao } from "@/components/ui/botao";
import type { NumeroPipeline, Regiao } from "@/lib/dados/tipos";
import {
  BuscaCompacta,
  CamposMaisFiltros,
  OPCOES_CLASSIFICACAO,
  SelecaoCompacta,
  type ValoresFiltro,
} from "./campos-filtro";
import { FiltrosPipelineCelular } from "./filtros-pipeline-celular";

/**
 * Filtros do pipeline: barra compacta de uma linha (busca, região,
 * classificação) e, atrás de "Mais filtros", semanas de/até e "só as
 * minhas famílias". Formulário GET sem JavaScript (o `details` nativo
 * recolhe o painel dentro do mesmo formulário): o link fica compartilhável.
 *
 * Abaixo de 600 px (DESIGN.md, 11.5 "Filtro recolhido"): só a busca e um
 * botão "Filtros" com a contagem dos ligados, que abre a folha inferior.
 */
export function FiltrosPipeline({
  pipeline,
  regioes,
  valores,
}: {
  pipeline: NumeroPipeline;
  regioes: Regiao[];
  valores: ValoresFiltro;
}) {
  const extras = [
    valores.semanasMin || valores.semanasMax,
    valores.minhas ? "1" : undefined,
  ].filter(Boolean).length;
  return (
    <>
      <form
        method="get"
        action="/pipeline"
        className="rounded-3 bg-areia-clara tablet:flex hidden items-center gap-2 p-1.5"
      >
        <input type="hidden" name="pipeline" value={pipeline} />
        <BuscaCompacta
          placeholder="Nome ou telefone"
          defaultValue={valores.busca}
        />
        <SelecaoCompacta
          rotulo="Região"
          name="regiaoId"
          opcaoVazia="Todas as regiões"
          defaultValue={valores.regiaoId}
          opcoes={regioes.map((r) => ({ valor: r.id, rotulo: r.nome }))}
        />
        <SelecaoCompacta
          rotulo="Classificação"
          name="classificacao"
          opcaoVazia="Quente, morno e frio"
          defaultValue={valores.classificacao}
          opcoes={OPCOES_CLASSIFICACAO}
        />
        <details className="group relative">
          <summary className="border-borda-campo bg-superficie text-apoio text-texto rounded-pilula min-h-toque inline-flex cursor-pointer list-none items-center gap-2 border-[1.5px] px-3 font-medium whitespace-nowrap lg:min-h-8 [&::-webkit-details-marker]:hidden">
            <SlidersHorizontal aria-hidden="true" className="size-4" />
            Mais filtros
            {extras > 0 ? (
              <span className="rounded-pilula bg-areia text-mini inline-flex min-w-5 items-center justify-center px-1 font-mono">
                {extras}
              </span>
            ) : null}
          </summary>
          <div className="rounded-2 border-linha bg-superficie shadow-2 absolute top-full right-0 z-30 mt-1 flex w-max flex-col gap-2 border p-3">
            <CamposMaisFiltros valores={valores} />
          </div>
        </details>
        <Botao type="submit" variante="secundario" tamanho="compacto">
          Filtrar
        </Botao>
        <Link
          href={`/pipeline?pipeline=${pipeline}`}
          className="text-apoio text-texto-2 min-h-toque inline-flex items-center px-1 whitespace-nowrap underline underline-offset-2 hover:no-underline lg:min-h-8"
        >
          Limpar
        </Link>
      </form>
      <FiltrosPipelineCelular
        pipeline={pipeline}
        regioes={regioes}
        valores={valores}
      />
    </>
  );
}
