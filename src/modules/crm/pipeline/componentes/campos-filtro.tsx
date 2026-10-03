import { Search } from "lucide-react";
import { CampoTexto } from "@/components/ui/campo-texto";
import type { ClassificacaoLead, Regiao } from "@/lib/dados/tipos";
import { CampoSelecao } from "./campo-selecao";

export interface ValoresFiltro {
  busca?: string;
  regiaoId?: string;
  classificacao?: string;
  minhas?: boolean;
  semanasMin?: string;
  semanasMax?: string;
}

export const OPCOES_CLASSIFICACAO: {
  valor: ClassificacaoLead;
  rotulo: string;
}[] = [
  { valor: "quente", rotulo: "Quente" },
  { valor: "morno", rotulo: "Morno" },
  { valor: "frio", rotulo: "Frio" },
];

/** Quantos filtros estão ligados (a busca fica de fora: ela é sempre visível). */
export function contarFiltrosLigados(valores: ValoresFiltro): number {
  return [
    valores.regiaoId,
    valores.classificacao,
    valores.minhas ? "1" : undefined,
    valores.semanasMin || valores.semanasMax,
  ].filter(Boolean).length;
}

/**
 * Os campos de filtro além da busca, os mesmos no formulário do computador
 * e na folha do celular.
 */
export function CamposFiltroPipeline({
  regioes,
  valores,
}: {
  regioes: Regiao[];
  valores: ValoresFiltro;
}) {
  return (
    <>
      <CampoSelecao
        rotulo="Região"
        name="regiaoId"
        opcaoVazia="Todas as regiões"
        defaultValue={valores.regiaoId}
        opcoes={regioes.map((r) => ({ valor: r.id, rotulo: r.nome }))}
        className="min-w-40"
      />
      <CampoSelecao
        rotulo="Classificação"
        name="classificacao"
        opcaoVazia="Quente, morno e frio"
        defaultValue={valores.classificacao}
        opcoes={OPCOES_CLASSIFICACAO.map((o) => ({
          valor: o.valor,
          rotulo: o.rotulo,
        }))}
        className="min-w-40"
      />
      <div className="flex gap-3">
        <CampoTexto
          rotulo="Semanas de"
          name="semanasMin"
          type="number"
          inputMode="numeric"
          defaultValue={valores.semanasMin}
          containerClassName="w-24"
        />
        <CampoTexto
          rotulo="até"
          name="semanasMax"
          type="number"
          inputMode="numeric"
          defaultValue={valores.semanasMax}
          containerClassName="w-24"
        />
      </div>
      <label className="border-borda-campo bg-superficie text-apoio text-texto min-h-toque rounded-pilula inline-flex w-fit items-center gap-2 border-[1.5px] px-4 font-medium">
        <input
          type="checkbox"
          name="minhas"
          value="1"
          defaultChecked={valores.minhas}
          className="accent-marinho size-4"
        />
        Só as minhas famílias
      </label>
    </>
  );
}

const CAIXA_COMPACTA =
  "border-borda-campo bg-superficie text-apoio text-texto rounded-pilula min-h-toque lg:min-h-8 border-[1.5px] px-3";

/** Busca de uma linha, para a barra compacta (rótulo só para leitor de tela). */
export function BuscaCompacta({
  placeholder,
  defaultValue,
}: {
  placeholder: string;
  defaultValue?: string;
}) {
  return (
    <label
      className={`${CAIXA_COMPACTA} flex min-w-40 flex-1 items-center gap-2`}
    >
      <Search aria-hidden="true" className="text-texto-2 size-4 shrink-0" />
      <span className="sr-only">Buscar</span>
      <input
        name="busca"
        type="search"
        defaultValue={defaultValue}
        placeholder={placeholder}
        className="min-w-0 flex-1 bg-transparent outline-none"
      />
    </label>
  );
}

/** Seleção nativa pequena, para a barra compacta. */
export function SelecaoCompacta({
  rotulo,
  name,
  opcaoVazia,
  opcoes,
  defaultValue,
}: {
  rotulo: string;
  name: string;
  opcaoVazia: string;
  opcoes: { valor: string; rotulo: string }[];
  defaultValue?: string;
}) {
  return (
    <select
      aria-label={rotulo}
      name={name}
      defaultValue={defaultValue ?? ""}
      className={`${CAIXA_COMPACTA} max-w-44 min-w-0 cursor-pointer`}
    >
      <option value="">{opcaoVazia}</option>
      {opcoes.map((o) => (
        <option key={o.valor} value={o.valor}>
          {o.rotulo}
        </option>
      ))}
    </select>
  );
}

/** Semanas de/até e "só as minhas", o conteúdo do painel "Mais filtros". */
export function CamposMaisFiltros({ valores }: { valores: ValoresFiltro }) {
  return (
    <>
      <div className="flex items-center gap-2">
        <label className="text-apoio text-texto-2 flex items-center gap-2">
          Semanas de
          <input
            name="semanasMin"
            type="number"
            inputMode="numeric"
            defaultValue={valores.semanasMin}
            className={`${CAIXA_COMPACTA} w-16`}
          />
        </label>
        <label className="text-apoio text-texto-2 flex items-center gap-2">
          até
          <input
            name="semanasMax"
            type="number"
            inputMode="numeric"
            defaultValue={valores.semanasMax}
            className={`${CAIXA_COMPACTA} w-16`}
          />
        </label>
      </div>
      <label className="text-apoio text-texto min-h-toque flex items-center gap-2 font-medium lg:min-h-8">
        <input
          type="checkbox"
          name="minhas"
          value="1"
          defaultChecked={valores.minhas}
          className="accent-marinho size-4"
        />
        Só as minhas famílias
      </label>
    </>
  );
}
