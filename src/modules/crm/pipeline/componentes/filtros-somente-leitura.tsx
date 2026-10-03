import Link from "next/link";
import { Botao } from "@/components/ui/botao";
import type { Regiao } from "@/lib/dados/tipos";
import { BuscaCompacta, SelecaoCompacta } from "./campos-filtro";

/**
 * Filtros das abas 3 e 4 na mesma barra compacta de uma linha do pipeline:
 * busca por nome e, no atendimento, a região. O pós-venda não traz região
 * (a função do banco não devolve), então só busca. Formulário GET.
 */
export function FiltrosSomenteLeitura({
  pipeline,
  regioes,
  busca,
  regiaoId,
}: {
  pipeline: 3 | 4;
  regioes?: Regiao[];
  busca?: string;
  regiaoId?: string;
}) {
  return (
    <form
      method="get"
      action="/pipeline"
      className="rounded-3 bg-areia-clara flex flex-wrap items-center gap-2 p-1.5"
    >
      <input type="hidden" name="pipeline" value={pipeline} />
      <BuscaCompacta placeholder="Nome da família" defaultValue={busca} />
      {regioes ? (
        <SelecaoCompacta
          rotulo="Região"
          name="regiaoId"
          opcaoVazia="Todas as regiões"
          defaultValue={regiaoId}
          opcoes={regioes.map((r) => ({ valor: r.id, rotulo: r.nome }))}
        />
      ) : null}
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
  );
}
