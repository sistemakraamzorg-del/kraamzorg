import Link from "next/link";
import { Search } from "lucide-react";
import { Botao } from "@/components/ui/botao";
import { CampoTexto } from "@/components/ui/campo-texto";
import type { Regiao } from "@/lib/dados/tipos";
import { CampoSelecao } from "./campo-selecao";

/**
 * Filtros das abas 3 e 4: busca por nome e, no atendimento, a região. O
 * pós-venda não traz região (a função do banco não devolve), então só busca.
 * Formulário GET, como os filtros das abas 1 e 2.
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
      className="rounded-3 bg-areia-clara flex flex-col gap-3 p-4 sm:flex-row sm:flex-wrap sm:items-end"
    >
      <input type="hidden" name="pipeline" value={pipeline} />
      <CampoTexto
        rotulo="Buscar"
        name="busca"
        defaultValue={busca}
        placeholder="Nome da família"
        containerClassName="min-w-48 flex-1"
        acessorio={
          <Search
            aria-hidden="true"
            className="text-texto-2 mr-3 size-4 shrink-0"
          />
        }
      />
      {regioes ? (
        <CampoSelecao
          rotulo="Região"
          name="regiaoId"
          opcaoVazia="Todas as regiões"
          defaultValue={regiaoId}
          opcoes={regioes.map((r) => ({ valor: r.id, rotulo: r.nome }))}
          className="min-w-40"
        />
      ) : null}
      <div className="flex flex-wrap items-center gap-3">
        <Botao type="submit" variante="secundario" tamanho="compacto">
          Filtrar
        </Botao>
        <Link
          href={`/pipeline?pipeline=${pipeline}`}
          className="text-apoio text-texto-2 min-h-toque inline-flex items-center underline underline-offset-2 hover:no-underline"
        >
          Limpar filtros
        </Link>
      </div>
    </form>
  );
}
