"use client";

import * as React from "react";
import { formatarMoeda } from "@/lib/formatacao";
import { formatarMoedaCurta, formatarPct } from "@/lib/gestao/formato";

/**
 * Gráficos do painel [v4.6]. Direção: institucional e legível. Cor sólida do
 * tema, linhas de grade finas, número escrito no dado, comparação ao lado e
 * dica ao passar o mouse (ou focar com o teclado). SVG e HTML puros, sem
 * biblioteca. Cada gráfico leva um rótulo acessível com os números.
 */

export type TomGrafico =
  | "dourado"
  | "sucesso"
  | "aviso"
  | "marinho"
  | "sensivel"
  | "areia"
  | "alerta"
  | "azul"
  | "lavanda";

const COR: Record<TomGrafico, string> = {
  dourado: "var(--dourado-vivo)",
  sucesso: "var(--sucesso-vivo)",
  aviso: "var(--aviso-vivo)",
  marinho: "var(--marinho)",
  sensivel: "var(--sensivel)",
  areia: "var(--areia)",
  alerta: "var(--alerta-vivo)",
  azul: "var(--azul-vivo)",
  lavanda: "var(--lavanda-vivo)",
};

/**
 * Como o valor é escrito. Texto simples (e não função) para poder vir de
 * componente de servidor. "moeda" espera centavos; "percentual" espera 0 a 100.
 */
export type FormatoValor = "numero" | "moeda" | "percentual";

function escrever(formato: FormatoValor, v: number, curto = false): string {
  if (formato === "moeda")
    return curto ? formatarMoedaCurta(v) : formatarMoeda(v);
  if (formato === "percentual") return formatarPct(v);
  // Número no jeito brasileiro: 17,1 e 1.250 (nunca 17.1 nem 1250).
  return new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 1 }).format(v);
}

/**
 * Dica que aparece ao passar o mouse ou ao focar o elemento. Fora disso ela
 * não existe na página (`hidden`, e não só transparente): invisível, mas com
 * largura, ela empurrava a página para o lado no celular. Quando aparece,
 * quebra a linha antes de passar da largura da tela.
 */
function Dica({ children }: { children: React.ReactNode }) {
  return (
    <span
      role="tooltip"
      className="bg-marinho text-texto-inverso text-apoio rounded-2 shadow-2 pointer-events-none absolute -top-2 left-1/2 z-10 hidden w-max max-w-[min(18rem,calc(100vw-2rem))] -translate-x-1/2 -translate-y-full px-2.5 py-1.5 text-center transition-[opacity,display] transition-discrete duration-150 group-hover:block group-focus-visible:block starting:opacity-0"
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
      className={`grafico-revelar ${className ?? "h-9 w-full"}`}
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
  /** Identidade da barra quando o rótulo pode repetir (ex.: o id da pessoa). */
  chave?: string;
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
  formato = "numero",
}: {
  itens: ItemBarra[];
  rotulo: string;
  larguraRotulo?: string;
  formato?: FormatoValor;
}) {
  const max = Math.max(...itens.map((i) => i.valor), 1);
  const total = itens.reduce((a, i) => a + i.valor, 0);
  return (
    <ul
      aria-label={`${rotulo}: ${itens.map((i) => `${i.rotulo} ${escrever(formato, i.valor)}`).join(", ")}`}
      className="flex flex-col gap-2.5"
    >
      {itens.map((i, k) => {
        const pct = total > 0 ? Math.round((i.valor / total) * 100) : 0;
        return (
          <li
            key={i.chave ?? i.rotulo}
            className="group relative grid items-center gap-3 outline-none"
            tabIndex={0}
            style={{ gridTemplateColumns: `${larguraRotulo} 1fr auto` }}
          >
            <span className="text-apoio text-texto-2 truncate text-right">
              {i.rotulo}
            </span>
            <span className="bg-areia-clara rounded-pilula h-4 overflow-hidden">
              <span
                className="grafico-largura rounded-pilula block h-full transition-[filter] duration-150 group-hover:brightness-95"
                style={{
                  width: `${Math.max((i.valor / max) * 100, i.valor > 0 ? 3 : 0)}%`,
                  background: COR[i.tom ?? "dourado"],
                  animationDelay: `${k * 50}ms`,
                }}
              />
            </span>
            <span className="text-apoio text-texto min-w-10 text-right font-mono whitespace-nowrap tabular-nums">
              {i.nota ?? escrever(formato, i.valor, true)}
            </span>
            <Dica>
              {i.dica ??
                `${i.rotulo}: ${escrever(formato, i.valor)} (${pct}% do total)`}
            </Dica>
          </li>
        );
      })}
    </ul>
  );
}

export interface ItemColuna {
  rotulo: string;
  /** Identidade da coluna quando o rótulo pode repetir. */
  chave?: string;
  valor: number;
  /** Segunda série opcional (ex.: "viraram contrato"). */
  valor2?: number;
  /** Texto no topo da coluna no lugar do valor (ex.: "sem amostra"). */
  valorTexto?: string;
  /** Texto da dica; uma lista vira uma linha por item. */
  dica?: string | string[];
}

/** Colunas verticais com grade, valor no topo e dica; `valor2` desenha um par. */
export function Colunas({
  itens,
  rotulo,
  altura = 140,
  tom = "dourado",
  tom2 = "sucesso",
  referencia,
  tomReferencia = "alerta",
  formato = "numero",
  legenda,
  maxValoresNoTopo = Infinity,
}: {
  itens: ItemColuna[];
  rotulo: string;
  altura?: number;
  tom?: TomGrafico;
  tom2?: TomGrafico;
  /** Linha de comparação (ex.: limite de ocupação), no mesmo eixo dos valores. */
  referencia?: { valor: number; rotulo: string };
  tomReferencia?: TomGrafico;
  formato?: FormatoValor;
  /** Nome de cada série, na ordem (série única ou par). */
  legenda?: string[];
  /** Acima disso o valor some do topo das colunas (fica na dica). */
  maxValoresNoTopo?: number;
}) {
  const max = Math.max(
    ...itens.flatMap((i) => [i.valor, i.valor2 ?? 0]),
    referencia?.valor ?? 0,
    1,
  );
  const dupla = itens.some((i) => i.valor2 !== undefined);
  const escreve = itens.length * (dupla ? 2 : 1) <= maxValoresNoTopo;
  const w = (v: number) => escrever(formato, v);
  return (
    <div
      role="group"
      aria-label={`${rotulo}: ${itens.map((i) => `${i.rotulo} ${w(i.valor)}${i.valor2 !== undefined ? ` e ${w(i.valor2)}` : ""}`).join(", ")}`}
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
            className="absolute inset-x-0 z-[1] border-t-2 border-dotted"
            style={{
              bottom: `${(referencia.valor / max) * 100}%`,
              borderColor: COR[tomReferencia],
            }}
          >
            <span
              className="text-texto-inverso text-apoio rounded-pilula absolute -top-6 right-0 px-2 py-0.5"
              style={{ background: COR[tomReferencia] }}
            >
              {referencia.rotulo}
              {formato === "numero"
                ? ""
                : `: ${escrever(formato, referencia.valor, true)}`}
            </span>
          </span>
        ) : null}
        <div className="absolute inset-0 flex items-end gap-3">
          {itens.map((i, k) => (
            <div
              key={i.chave ?? i.rotulo}
              className="group relative flex h-full flex-1 items-end justify-center gap-1 outline-none"
              tabIndex={0}
            >
              <span
                className="grafico-altura rounded-t-1 relative w-full max-w-8 transition-[filter] duration-150 group-hover:brightness-95"
                style={{
                  height: `${(Math.max(i.valor, 0) / max) * 100}%`,
                  background: COR[tom],
                  animationDelay: `${k * 50}ms`,
                }}
              >
                {(escreve && !dupla) || i.valorTexto ? (
                  <span
                    className={
                      i.valorTexto
                        ? "text-apoio text-texto-2 absolute bottom-full left-1/2 w-14 -translate-x-1/2 pb-1 text-center leading-tight"
                        : `text-apoio text-texto absolute -top-5 left-1/2 -translate-x-1/2 font-mono whitespace-nowrap tabular-nums ${dupla ? "max-sm:hidden" : ""}`
                    }
                  >
                    {i.valorTexto ?? escrever(formato, i.valor, true)}
                  </span>
                ) : null}
              </span>
              {dupla ? (
                <span
                  className="grafico-altura rounded-t-1 relative w-full max-w-8 transition-[filter] duration-150 group-hover:brightness-95"
                  style={{
                    height: `${(Math.max(i.valor2 ?? 0, 0) / max) * 100}%`,
                    background: COR[tom2],
                    animationDelay: `${k * 50}ms`,
                  }}
                ></span>
              ) : null}
              <Dica>
                {Array.isArray(i.dica) ? (
                  <span className="flex flex-col">
                    {i.dica.map((l) => (
                      <span key={l}>{l}</span>
                    ))}
                  </span>
                ) : (
                  (i.dica ??
                  `${i.rotulo}: ${w(i.valor)}${dupla ? ` e ${w(i.valor2 ?? 0)}` : ""}`)
                )}
              </Dica>
            </div>
          ))}
        </div>
      </div>
      <div className="mt-2 flex gap-3">
        {itens.map((i) => (
          <span
            key={i.chave ?? i.rotulo}
            className="text-apoio text-texto-3 flex-1 text-center"
          >
            {i.rotulo}
            {dupla ? (
              <span className="text-texto mt-1 flex flex-col items-center gap-0.5 font-mono tabular-nums">
                <span className="inline-flex items-center gap-1">
                  <span
                    aria-hidden="true"
                    className="rounded-pilula size-2"
                    style={{ background: COR[tom] }}
                  />
                  {escrever(formato, i.valor, true)}
                </span>
                <span className="inline-flex items-center gap-1">
                  <span
                    aria-hidden="true"
                    className="rounded-pilula size-2"
                    style={{ background: COR[tom2] }}
                  />
                  {escrever(formato, i.valor2 ?? 0, true)}
                </span>
              </span>
            ) : null}
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
  formato = "numero",
}: {
  fatias: FatiaRosca[];
  centro: { valor: string; legenda: string };
  rotulo: string;
  /** 14 = rosca; 44 = pizza cheia. */
  espessura?: number;
  formato?: FormatoValor;
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
        aria-label={`${rotulo}: ${fatias.map((f) => `${f.rotulo} ${escrever(formato, f.valor)}`).join(", ")}`}
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
              className="grafico-arco"
              style={
                {
                  transition: "stroke-width 150ms",
                  "--circunferencia": c,
                  animationDelay: `${i * 80}ms`,
                } as React.CSSProperties
              }
            >
              <title>{`${f.rotulo}: ${escrever(formato, f.valor)} (${Math.round((f.valor / total) * 100)}%)`}</title>
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
              {ativa !== null
                ? escrever(formato, fatias[ativa]!.valor, true)
                : centro.valor}
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
            <span className="min-w-0 break-words">{f.rotulo}</span>
            <span className="text-texto ml-auto font-mono whitespace-nowrap tabular-nums">
              {escrever(formato, f.valor)}{" "}
              <span className="text-texto-3">
                {Math.round((f.valor / total) * 100)}%
              </span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
