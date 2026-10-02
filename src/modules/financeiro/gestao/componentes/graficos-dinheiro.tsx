import * as React from "react";
import type { TomGrafico } from "@/components/graficos";
import { formatarMoeda } from "@/lib/formatacao";
import { formatarMoedaCurta } from "@/lib/gestao/formato";

/**
 * Gráficos de dinheiro do painel e do financeiro. Mesma linguagem de
 * src/components/graficos/index.tsx (cor sólida, grade fina, dica no hover e
 * no foco), mas o valor chega em centavos e é escrito em reais na tela, o que
 * aquele arquivo ainda não faz. ponytail: quando o index.tsx ganhar uma prop
 * `formatar`, estes dois componentes podem sair.
 */

const COR: Record<TomGrafico, string> = {
  dourado: "var(--dourado)",
  sucesso: "var(--sucesso)",
  aviso: "var(--aviso)",
  marinho: "var(--marinho)",
  sensivel: "var(--sensivel)",
  areia: "var(--areia)",
  alerta: "var(--alerta)",
};

export interface ItemColunaMoeda {
  rotulo: string;
  centavos: number;
  /** Segunda série (par). */
  centavos2?: number;
  /** Linhas da dica. */
  dica: string[];
}

export function ColunasMoeda({
  itens,
  rotulo,
  legenda,
  tom = "marinho",
  tom2 = "dourado",
  referencia,
  altura = 150,
}: {
  itens: ItemColunaMoeda[];
  rotulo: string;
  /** Nome de cada série, na ordem. */
  legenda?: string[];
  tom?: TomGrafico;
  tom2?: TomGrafico;
  referencia?: { centavos: number; rotulo: string };
  altura?: number;
}) {
  const dupla = itens.some((i) => i.centavos2 !== undefined);
  const max = Math.max(
    ...itens.flatMap((i) => [i.centavos, i.centavos2 ?? 0]),
    referencia?.centavos ?? 0,
    1,
  );
  const h = (v: number) => `${(Math.max(v, 0) / max) * 100}%`;
  const escreve = itens.length * (dupla ? 2 : 1) <= 6;
  return (
    <div
      role="group"
      aria-label={`${rotulo}: ${itens.map((i) => `${i.rotulo} ${formatarMoeda(i.centavos)}${i.centavos2 !== undefined ? ` e ${formatarMoeda(i.centavos2)}` : ""}`).join(", ")}`}
    >
      <div className="relative mt-6" style={{ height: altura }}>
        {[0, 0.5, 1].map((f) => (
          <span
            key={f}
            aria-hidden="true"
            className="border-linha absolute inset-x-0 border-t border-dashed"
            style={{ bottom: `${f * 100}%` }}
          />
        ))}
        {referencia ? (
          <span
            aria-hidden="true"
            className="border-marinho absolute inset-x-0 z-[1] border-t-2 border-dotted"
            style={{ bottom: h(referencia.centavos) }}
          >
            <span className="bg-marinho text-texto-inverso text-apoio rounded-pilula absolute -top-6 right-0 px-2 py-0.5">
              {referencia.rotulo}: {formatarMoedaCurta(referencia.centavos)}
            </span>
          </span>
        ) : null}
        <div className="absolute inset-0 flex items-end gap-3">
          {itens.map((i) => (
            <div
              key={i.rotulo}
              tabIndex={0}
              className="group relative flex h-full min-h-11 flex-1 items-end justify-center gap-1 outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--dourado)]"
            >
              {[
                { v: i.centavos, c: tom },
                ...(dupla ? [{ v: i.centavos2 ?? 0, c: tom2 }] : []),
              ].map((b, k) => (
                <span
                  key={k}
                  className="rounded-t-1 relative w-full max-w-9 transition-[filter] duration-150 group-hover:brightness-95"
                  style={{ height: h(b.v), background: COR[b.c] }}
                >
                  {escreve ? (
                    <span className="text-apoio text-texto absolute -top-5 left-1/2 -translate-x-1/2 font-mono whitespace-nowrap tabular-nums">
                      {formatarMoedaCurta(b.v)}
                    </span>
                  ) : null}
                </span>
              ))}
              <span
                role="tooltip"
                className="bg-marinho text-texto-inverso text-apoio rounded-2 shadow-2 pointer-events-none absolute -top-2 left-1/2 z-10 flex -translate-x-1/2 -translate-y-full flex-col px-2.5 py-1.5 whitespace-nowrap opacity-0 transition-opacity duration-150 group-hover:opacity-100 group-focus-visible:opacity-100"
              >
                {i.dica.map((l) => (
                  <span key={l}>{l}</span>
                ))}
              </span>
            </div>
          ))}
        </div>
      </div>
      <div className="mt-2 flex gap-3">
        {itens.map((i) => (
          <span
            key={i.rotulo}
            className="text-apoio text-texto-2 flex-1 text-center"
          >
            {i.rotulo}
          </span>
        ))}
      </div>
      {legenda && legenda.length > 0 ? (
        <ul className="text-apoio text-texto-2 mt-3 flex flex-wrap gap-x-4 gap-y-1">
          {legenda.map((l, k) => (
            <li key={l} className="flex items-center gap-2">
              <span
                aria-hidden="true"
                className="rounded-pilula size-2.5"
                style={{ background: COR[k === 0 ? tom : tom2] }}
              />
              {l}
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

export interface FatiaMoeda {
  rotulo: string;
  centavos: number;
  tom: TomGrafico;
}

/** Pizza com a legenda em reais e percentual, e o total ao lado. */
export function PizzaMoeda({
  fatias,
  rotulo,
}: {
  fatias: FatiaMoeda[];
  rotulo: string;
}) {
  const total = Math.max(
    fatias.reduce((a, f) => a + f.centavos, 0),
    1,
  );
  const r = 24;
  const c = 2 * Math.PI * r;
  const inicios = fatias.map((_, k) =>
    fatias.slice(0, k).reduce((a, f) => a + (f.centavos / total) * c, 0),
  );
  return (
    <div className="flex flex-wrap items-center gap-5">
      <svg
        viewBox="0 0 120 120"
        role="img"
        aria-label={`${rotulo}: ${fatias.map((f) => `${f.rotulo} ${formatarMoeda(f.centavos)}`).join(", ")}`}
        className="size-36 shrink-0"
      >
        {fatias.map((f, k) => {
          const tam = (f.centavos / total) * c;
          const inicio = inicios[k]!;
          return (
            <circle
              key={f.rotulo}
              cx="60"
              cy="60"
              r={r}
              fill="none"
              stroke={COR[f.tom]}
              strokeWidth={44}
              strokeDasharray={`${Math.max(tam - 0.8, 0)} ${c}`}
              strokeDashoffset={-inicio}
              transform="rotate(-90 60 60)"
            >
              <title>{`${f.rotulo}: ${formatarMoeda(f.centavos)} (${Math.round((f.centavos / total) * 100)}%)`}</title>
            </circle>
          );
        })}
      </svg>
      <ul className="flex min-w-0 flex-1 flex-col gap-2">
        {fatias.map((f) => (
          <li
            key={f.rotulo}
            className="text-apoio text-texto-2 flex items-center gap-2"
          >
            <span
              aria-hidden="true"
              className="rounded-pilula size-2.5 shrink-0"
              style={{ background: COR[f.tom] }}
            />
            <span className="truncate">{f.rotulo}</span>
            <span className="text-texto ml-auto font-mono whitespace-nowrap tabular-nums">
              {formatarMoeda(f.centavos)}
              <span className="text-texto-3 ml-1">
                {Math.round((f.centavos / total) * 100)}%
              </span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Despesas por categoria: as 5 maiores e o resto junto, em tons distintos. */
const TONS_PIZZA: TomGrafico[] = [
  "marinho",
  "dourado",
  "sucesso",
  "sensivel",
  "aviso",
  "areia",
];

export function fatiasDeDespesa(
  itens: { rotulo: string; centavos: number }[],
): FatiaMoeda[] {
  const ord = itens
    .filter((i) => i.centavos > 0)
    .sort((a, b) => b.centavos - a.centavos);
  const topo = ord.slice(0, 5);
  const resto = ord.slice(5).reduce((a, i) => a + i.centavos, 0);
  const lista =
    resto > 0
      ? [...topo, { rotulo: "Demais categorias", centavos: resto }]
      : topo;
  return lista.map((i, k) => ({ ...i, tom: TONS_PIZZA[k]! }));
}
