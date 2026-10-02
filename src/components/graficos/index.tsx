"use client";

import * as React from "react";

/**
 * Gráficos do painel [v4.6]. Direção: institucional e legível. Cor sólida do
 * tema, linhas de grade finas, número escrito no dado, comparação ao lado e
 * dica ao passar o mouse (ou focar com o teclado). SVG e HTML puros, sem
 * biblioteca. Cada gráfico leva um rótulo acessível com os números.
 */

export type TomGrafico =
  "dourado" | "sucesso" | "aviso" | "marinho" | "sensivel" | "areia" | "alerta";

const COR: Record<TomGrafico, string> = {
  dourado: "var(--dourado)",
  sucesso: "var(--sucesso)",
  aviso: "var(--aviso)",
  marinho: "var(--marinho)",
  sensivel: "var(--sensivel)",
  areia: "var(--areia)",
  alerta: "var(--alerta)",
};

/** Dica que aparece ao passar o mouse ou ao focar o elemento. */
function Dica({ children }: { children: React.ReactNode }) {
  return (
    <span
      role="tooltip"
      className="bg-marinho text-texto-inverso text-apoio rounded-2 shadow-2 pointer-events-none absolute -top-2 left-1/2 z-10 -translate-x-1/2 -translate-y-full px-2.5 py-1.5 whitespace-nowrap opacity-0 transition-opacity duration-150 group-hover:opacity-100 group-focus-visible:opacity-100"
    >
      {children}
    </span>
  );
}

/** Linha pequena com área suave, para os cartões de resumo. */
export function Sparkline({
  valores,
  tom = "dourado",
  rotulo,
  className,
}: {
  valores: number[];
  tom?: TomGrafico;
  rotulo: string;
  className?: string;
}) {
  const id = `spark-${React.useId().replace(/:/g, "")}`;
  const w = 120;
  const h = 36;
  const pontos = valores.length > 1 ? valores : [0, 0];
  const max = Math.max(...pontos, 1);
  const passo = w / (pontos.length - 1);
  const y = (v: number) => h - 3 - (v / max) * (h - 8);
  const linha = pontos
    .map(
      (v, i) =>
        `${i === 0 ? "M" : "L"}${(i * passo).toFixed(1)} ${y(v).toFixed(1)}`,
    )
    .join(" ");
  const area = `${linha} L${w} ${h} L0 ${h} Z`;
  const ultimo = pontos[pontos.length - 1] ?? 0;
  return (
    <svg
      viewBox={`0 0 ${w} ${h}`}
      preserveAspectRatio="none"
      role="img"
      aria-label={rotulo}
      className={className ?? "h-9 w-full"}
    >
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={COR[tom]} stopOpacity="0.22" />
          <stop offset="100%" stopColor={COR[tom]} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill={`url(#${id})`} />
      <path
        d={linha}
        fill="none"
        stroke={COR[tom]}
        strokeWidth="1.8"
        strokeLinejoin="round"
        strokeLinecap="round"
        vectorEffect="non-scaling-stroke"
      />
      <circle cx={w} cy={y(ultimo)} r="2.4" fill={COR[tom]} />
    </svg>
  );
}

export interface ItemBarra {
  rotulo: string;
  valor: number;
  tom?: TomGrafico;
  /** Texto à direita da barra (ex.: "23" ou "61%"). */
  nota?: string;
  /** Texto da dica ao passar o mouse (padrão: "rótulo: valor"). */
  dica?: string;
}

/** Barras horizontais de cor sólida, com valor escrito e dica. */
export function BarrasHorizontais({
  itens,
  rotulo,
  larguraRotulo = "7.5rem",
}: {
  itens: ItemBarra[];
  rotulo: string;
  larguraRotulo?: string;
}) {
  const max = Math.max(...itens.map((i) => i.valor), 1);
  const total = itens.reduce((a, i) => a + i.valor, 0);
  return (
    <ul
      aria-label={`${rotulo}: ${itens.map((i) => `${i.rotulo} ${i.valor}`).join(", ")}`}
      className="flex flex-col gap-2.5"
    >
      {itens.map((i) => {
        const pct = total > 0 ? Math.round((i.valor / total) * 100) : 0;
        return (
          <li
            key={i.rotulo}
            className="group relative grid items-center gap-3 outline-none"
            tabIndex={0}
            style={{ gridTemplateColumns: `${larguraRotulo} 1fr 2.75rem` }}
          >
            <span className="text-apoio text-texto-2 truncate text-right">
              {i.rotulo}
            </span>
            <span className="bg-areia-clara rounded-pilula h-4 overflow-hidden">
              <span
                className="rounded-pilula block h-full transition-[filter] duration-150 group-hover:brightness-95"
                style={{
                  width: `${Math.max((i.valor / max) * 100, i.valor > 0 ? 3 : 0)}%`,
                  background: COR[i.tom ?? "dourado"],
                }}
              />
            </span>
            <span className="text-apoio text-texto text-right font-mono tabular-nums">
              {i.nota ?? i.valor}
            </span>
            <Dica>
              {i.dica ?? `${i.rotulo}: ${i.valor} (${pct}% do total)`}
            </Dica>
          </li>
        );
      })}
    </ul>
  );
}

export interface ItemColuna {
  rotulo: string;
  valor: number;
  /** Segunda série opcional (ex.: "viraram contrato"). */
  valor2?: number;
  dica?: string;
}

/** Colunas verticais com grade, valor no topo e dica; `valor2` desenha um par. */
export function Colunas({
  itens,
  rotulo,
  altura = 140,
  tom = "dourado",
  tom2 = "sucesso",
  referencia,
}: {
  itens: ItemColuna[];
  rotulo: string;
  altura?: number;
  tom?: TomGrafico;
  tom2?: TomGrafico;
  /** Linha de comparação (ex.: limite de ocupação), no mesmo eixo dos valores. */
  referencia?: { valor: number; rotulo: string };
}) {
  const max = Math.max(
    ...itens.flatMap((i) => [i.valor, i.valor2 ?? 0]),
    referencia?.valor ?? 0,
    1,
  );
  const dupla = itens.some((i) => i.valor2 !== undefined);
  return (
    <div
      role="group"
      aria-label={`${rotulo}: ${itens.map((i) => `${i.rotulo} ${i.valor}`).join(", ")}`}
    >
      <div className="relative" style={{ height: altura }}>
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
            className="border-alerta absolute inset-x-0 z-[1] border-t-2 border-dotted"
            style={{ bottom: `${(referencia.valor / max) * 100}%` }}
          >
            <span className="bg-alerta text-texto-inverso text-apoio rounded-pilula absolute -top-5 right-0 px-2 py-0.5">
              {referencia.rotulo}
            </span>
          </span>
        ) : null}
        <div className="absolute inset-0 flex items-end gap-3">
          {itens.map((i) => (
            <div
              key={i.rotulo}
              className="group relative flex h-full flex-1 items-end justify-center gap-1 outline-none"
              tabIndex={0}
            >
              <span
                className="rounded-t-1 relative w-full max-w-8 transition-[filter] duration-150 group-hover:brightness-95"
                style={{
                  height: `${(i.valor / max) * 100}%`,
                  background: COR[tom],
                }}
              >
                <span className="text-apoio text-texto absolute -top-5 left-1/2 -translate-x-1/2 font-mono tabular-nums">
                  {i.valor}
                </span>
              </span>
              {dupla ? (
                <span
                  className="rounded-t-1 w-full max-w-8 transition-[filter] duration-150 group-hover:brightness-95"
                  style={{
                    height: `${((i.valor2 ?? 0) / max) * 100}%`,
                    background: COR[tom2],
                  }}
                />
              ) : null}
              <Dica>
                {i.dica ??
                  `${i.rotulo}: ${i.valor}${dupla ? ` e ${i.valor2 ?? 0}` : ""}`}
              </Dica>
            </div>
          ))}
        </div>
      </div>
      <div className="mt-2 flex gap-3">
        {itens.map((i) => (
          <span
            key={i.rotulo}
            className="text-apoio text-texto-3 flex-1 text-center"
          >
            {i.rotulo}
          </span>
        ))}
      </div>
    </div>
  );
}

export interface FatiaRosca {
  rotulo: string;
  valor: number;
  tom: TomGrafico;
}

/** Rosca (ou pizza, com `espessura` grande), número no centro e legenda com percentual. */
export function Rosca({
  fatias,
  centro,
  rotulo,
  espessura = 14,
}: {
  fatias: FatiaRosca[];
  centro: { valor: string; legenda: string };
  rotulo: string;
  /** 14 = rosca; 44 = pizza cheia. */
  espessura?: number;
}) {
  const total = Math.max(
    fatias.reduce((a, f) => a + f.valor, 0),
    1,
  );
  const r = espessura >= 40 ? 24 : 42;
  const c = 2 * Math.PI * r;
  const inicios = fatias.map((_, i) =>
    fatias.slice(0, i).reduce((a, f) => a + (f.valor / total) * c, 0),
  );
  const [ativa, setAtiva] = React.useState<number | null>(null);
  const pizza = espessura >= 40;
  return (
    <div className="flex flex-wrap items-center gap-5">
      <svg
        viewBox="0 0 120 120"
        role="img"
        aria-label={`${rotulo}: ${fatias.map((f) => `${f.rotulo} ${f.valor}`).join(", ")}`}
        className="size-36 shrink-0"
      >
        <circle
          cx="60"
          cy="60"
          r={r}
          fill="none"
          stroke="var(--areia-clara)"
          strokeWidth={espessura}
        />
        {fatias.map((f, i) => {
          const tam = (f.valor / total) * c;
          return (
            <circle
              key={f.rotulo}
              cx="60"
              cy="60"
              r={r}
              fill="none"
              stroke={COR[f.tom]}
              strokeWidth={ativa === i ? espessura + 3 : espessura}
              strokeDasharray={`${Math.max(tam - 1.5, 0)} ${c - Math.max(tam - 1.5, 0)}`}
              strokeDashoffset={-inicios[i]!}
              transform="rotate(-90 60 60)"
              onMouseEnter={() => setAtiva(i)}
              onMouseLeave={() => setAtiva(null)}
              style={{ transition: "stroke-width 150ms" }}
            >
              <title>{`${f.rotulo}: ${f.valor} (${Math.round((f.valor / total) * 100)}%)`}</title>
            </circle>
          );
        })}
        {pizza ? null : (
          <>
            <text
              x="60"
              y="58"
              textAnchor="middle"
              className="fill-[var(--texto)]"
              style={{ fontSize: 22, fontFamily: "var(--font-titulo)" }}
            >
              {ativa !== null ? String(fatias[ativa]!.valor) : centro.valor}
            </text>
            <text
              x="60"
              y="74"
              textAnchor="middle"
              className="fill-[var(--texto-3)]"
              style={{ fontSize: 8 }}
            >
              {ativa !== null ? fatias[ativa]!.rotulo : centro.legenda}
            </text>
          </>
        )}
      </svg>
      <ul className="flex min-w-0 flex-1 flex-col gap-1.5">
        {fatias.map((f, i) => (
          <li
            key={f.rotulo}
            className="text-apoio text-texto-2 flex items-center gap-2"
            onMouseEnter={() => setAtiva(i)}
            onMouseLeave={() => setAtiva(null)}
          >
            <span
              aria-hidden="true"
              className="rounded-pilula size-2.5 shrink-0"
              style={{ background: COR[f.tom] }}
            />
            <span className="truncate">{f.rotulo}</span>
            <span className="text-texto ml-auto font-mono tabular-nums">
              {f.valor}
              <span className="text-texto-3 ml-1">
                {Math.round((f.valor / total) * 100)}%
              </span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
