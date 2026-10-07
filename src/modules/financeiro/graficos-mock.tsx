"use client";

import * as React from "react";
import { formatarMoeda } from "@/lib/formatacao";
import { formatarPct } from "@/lib/gestao/formato";

/**
 * Gráficos do HTML de referência da cliente (`.chart`: barras, linhas, rosca,
 * funil, barras horizontais, medidor e mini linha), em SVG puro e com as
 * mesmas medidas. A largura do desenho acompanha a do cartão, como no
 * mockup. Dinheiro chega em centavos e só vira texto aqui. As animações
 * (crescer das barras, desenhar da linha) usam as classes `grafico-*` do
 * tema e ficam desligadas em prefers-reduced-motion.
 */

export type TomMock =
  | "dourado"
  | "dourado2"
  | "areia"
  | "marinho"
  | "azul"
  | "sucesso"
  | "aviso"
  | "alerta"
  | "sensivel";

const COR: Record<TomMock, string> = {
  dourado: "var(--dourado-vivo)",
  dourado2: "var(--dourado-2)",
  areia: "var(--areia)",
  marinho: "var(--marinho)",
  azul: "var(--azul-vivo)",
  sucesso: "var(--sucesso-vivo)",
  aviso: "var(--aviso-vivo)",
  alerta: "var(--alerta-vivo)",
  sensivel: "var(--sensivel)",
};

/** "moeda" espera centavos; "percentual" espera 0 a 100. */
export type FormatoMock = "numero" | "moeda" | "percentual";

/** Texto curto do eixo: 74,9 mil, 12 mil, 36%. */
function eixo(f: FormatoMock, v: number): string {
  if (f === "percentual") return `${Math.round(v)}%`;
  if (f === "moeda") {
    const reais = v / 100;
    if (Math.abs(reais) < 1000) return String(Math.round(reais));
    const k = new Intl.NumberFormat("pt-BR", {
      maximumFractionDigits: Math.abs(reais) >= 10000 ? 0 : 1,
    }).format(reais / 1000);
    return `${k} mil`;
  }
  return String(Math.round(v * 10) / 10).replace(".", ",");
}

/** Texto completo da dica. */
function dica(f: FormatoMock, v: number): string {
  if (f === "moeda") return formatarMoeda(v);
  if (f === "percentual") return formatarPct(v);
  return new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 1 }).format(v);
}

/** Máximo "redondo" do eixo (`nice()` do mockup). */
function redondo(m: number): number {
  const base = Math.max(m, 1);
  const p = Math.pow(10, Math.floor(Math.log10(base)));
  const r = base / p;
  const passos = [1, 1.2, 1.5, 2, 2.5, 3, 4, 5, 6, 8, 10];
  return (passos.find((s) => r <= s) ?? 10) * p;
}

/** Largura do cartão em px, como o `paint()` do mockup (240 a 780). */
function useLargura(inicial: number) {
  const ref = React.useRef<HTMLDivElement>(null);
  const [w, setW] = React.useState(inicial);
  React.useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const medir = () =>
      setW(Math.max(240, Math.min(el.clientWidth || inicial, 780)));
    medir();
    const obs = new ResizeObserver(medir);
    obs.observe(el);
    return () => obs.disconnect();
  }, [inicial]);
  return [ref, w] as const;
}

export interface SerieMock {
  nome: string;
  tom: TomMock;
  valores: number[];
  /** Só nas linhas: área suave sob a linha. */
  area?: boolean;
}

function Legenda({ series }: { series: { nome: string; tom: TomMock }[] }) {
  if (series.length < 2) return null;
  return (
    <ul className="text-tinta-50 mt-2.5 flex flex-wrap gap-3.5 text-[11px]">
      {series.map((s) => (
        <li key={s.nome} className="flex items-center">
          <i
            aria-hidden="true"
            className="mr-[5px] inline-block size-[9px] rounded-[2px]"
            style={{ background: COR[s.tom] }}
          />
          {s.nome}
        </li>
      ))}
    </ul>
  );
}

const TEXTO_EIXO = "fill-tinta-50 font-mono text-[9px]";
const TEXTO_ROTULO = "fill-tinta-50 font-sans text-[10px]";

/** Linhas de grade e valores do eixo vertical (cinco marcas, de 0 ao máximo). */
function Grade({
  W,
  L,
  R,
  T,
  ih,
  mx,
  formato,
}: {
  W: number;
  L: number;
  R: number;
  T: number;
  ih: number;
  mx: number;
  formato: FormatoMock;
}) {
  return (
    <>
      {[0, 1, 2, 3, 4].map((g) => {
        const y = T + ih - (ih * g) / 4;
        return (
          <g key={g} aria-hidden="true">
            <line
              x1={L}
              y1={y}
              x2={W - R}
              y2={y}
              stroke="var(--areia-clara)"
              strokeWidth={0.6}
            />
            <text className={TEXTO_EIXO} x={L - 5} y={y + 3} textAnchor="end">
              {/* Contagem não tem fração: com poucas famílias, a marca
                  0,3 ou 0,8 confunde; a linha fica, o número some. */}
              {formato === "numero" && !Number.isInteger((mx * g) / 4)
                ? ""
                : eixo(formato, (mx * g) / 4)}
            </text>
          </g>
        );
      })}
    </>
  );
}

/** Barras agrupadas (`chBars`). */
export function BarrasMock({
  rotulos,
  series,
  altura = 190,
  formato = "numero",
  rotulo,
  larguraInicial = 420,
}: {
  rotulos: string[];
  series: SerieMock[];
  altura?: number;
  formato?: FormatoMock;
  /** Texto para leitor de tela. */
  rotulo: string;
  larguraInicial?: number;
}) {
  const [ref, W] = useLargura(larguraInicial);
  const H = altura;
  const L = 34;
  const R = 8;
  const T = 10;
  const B = 24;
  const iw = W - L - R;
  const ih = H - T - B;
  const topo = Math.max(
    ...rotulos.map((_, i) => Math.max(...series.map((s) => s.valores[i] ?? 0))),
    0,
  );
  const mx = redondo(topo * 1.12);
  const gw = iw / Math.max(rotulos.length, 1);
  const bw = (gw * 0.62) / series.length;
  return (
    <div ref={ref} className="w-full">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        role="img"
        aria-label={rotulo}
        className="block h-auto w-full overflow-visible"
      >
        <Grade W={W} L={L} R={R} T={T} ih={ih} mx={mx} formato={formato} />
        {rotulos.map((lb, i) => {
          const cx = L + gw * i + gw / 2;
          return (
            <g key={lb + i}>
              {series.map((s, j) => {
                const v = s.valores[i] ?? 0;
                const h = (ih * Math.max(v, 0)) / mx;
                const x = cx - (bw * series.length) / 2 + bw * j;
                return (
                  <rect
                    key={s.nome}
                    className="grafico-altura hover:brightness-110"
                    x={x.toFixed(1)}
                    y={(T + ih - Math.max(h, 0.6)).toFixed(1)}
                    width={Math.max(bw - 1.5, 1).toFixed(1)}
                    height={Math.max(h, 0.6).toFixed(1)}
                    rx={2.5}
                    fill={COR[s.tom]}
                    style={{ animationDelay: `${i * 50 + j * 30}ms` }}
                  >
                    <title>{`${s.nome}, ${lb}: ${dica(formato, v)}`}</title>
                  </rect>
                );
              })}
              <text
                className={TEXTO_ROTULO}
                x={cx}
                y={H - 8}
                textAnchor="middle"
              >
                {lb}
              </text>
            </g>
          );
        })}
      </svg>
      <Legenda series={series} />
    </div>
  );
}

/** Linhas desenhadas, com área opcional (`chLine`). */
export function LinhaMock({
  rotulos,
  series,
  altura = 190,
  formato = "numero",
  rotulo,
  larguraInicial = 520,
}: {
  rotulos: string[];
  series: SerieMock[];
  altura?: number;
  formato?: FormatoMock;
  rotulo: string;
  larguraInicial?: number;
}) {
  const [ref, W] = useLargura(larguraInicial);
  const H = altura;
  const L = 34;
  const R = 10;
  const T = 10;
  const B = 24;
  const iw = W - L - R;
  const ih = H - T - B;
  const mx = redondo(Math.max(...series.flatMap((s) => s.valores), 0) * 1.15);
  const n = rotulos.length;
  const sx = n > 1 ? iw / (n - 1) : 0;
  return (
    <div ref={ref} className="w-full">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        role="img"
        aria-label={rotulo}
        className="block h-auto w-full overflow-visible"
      >
        <Grade W={W} L={L} R={R} T={T} ih={ih} mx={mx} formato={formato} />
        {rotulos.map((lb, i) => (
          <text
            key={lb + i}
            className={TEXTO_ROTULO}
            x={L + sx * i}
            y={H - 8}
            textAnchor="middle"
          >
            {lb}
          </text>
        ))}
        {series.map((s, j) => {
          const pts = s.valores.map(
            (v, i) => [L + sx * i, T + ih - (ih * v) / mx] as const,
          );
          if (pts.length === 0) return null;
          const d = pts
            .map(
              (p, i) => `${i ? "L" : "M"}${p[0].toFixed(1)} ${p[1].toFixed(1)}`,
            )
            .join(" ");
          const ultimo = pts[pts.length - 1]!;
          return (
            <g key={s.nome}>
              {s.area ? (
                <path
                  d={`${d} L${ultimo[0]} ${T + ih} L${pts[0]![0]} ${T + ih} Z`}
                  fill={COR[s.tom]}
                  opacity={0.13}
                />
              ) : null}
              <path
                className="grafico-revelar"
                d={d}
                fill="none"
                stroke={COR[s.tom]}
                strokeWidth={1.8}
                strokeLinecap="round"
                strokeLinejoin="round"
                style={{ animationDelay: `${j * 150}ms` }}
              />
              {pts.map((p, i) => (
                <circle
                  key={i}
                  cx={p[0].toFixed(1)}
                  cy={p[1].toFixed(1)}
                  r={2.6}
                  fill={COR[s.tom]}
                  stroke="var(--branco)"
                  strokeWidth={1.4}
                >
                  <title>{`${s.nome}, ${rotulos[i]}: ${dica(formato, s.valores[i] ?? 0)}`}</title>
                </circle>
              ))}
            </g>
          );
        })}
      </svg>
      <Legenda series={series} />
    </div>
  );
}

export interface LinhaHBarra {
  rotulo: string;
  valor: number;
  tom?: TomMock;
  /** Texto à direita; sem ele, o valor no formato do gráfico. */
  nota?: string;
  /**
   * Faz da linha um medidor para leitor de tela (`role="meter"`), com este
   * texto como nome e `agora` (0 a 100) como valor; sem `agora`, sem número.
   */
  medidor?: { nome: string; agora: number | null };
}

/** Barras horizontais (`chHBars`). */
export function HBarrasMock({
  linhas,
  formato = "numero",
  rotulo,
  rotuloLargura = 128,
  direita = 44,
  larguraInicial = 340,
}: {
  linhas: LinhaHBarra[];
  formato?: FormatoMock;
  rotulo: string;
  rotuloLargura?: number;
  /** Espaço reservado ao texto do valor, à direita. */
  direita?: number;
  larguraInicial?: number;
}) {
  const [ref, W] = useLargura(larguraInicial);
  const rh = 26;
  const H = linhas.length * rh + 6;
  const mx = Math.max(...linhas.map((l) => l.valor), 1) * 1.02;
  return (
    <div ref={ref} className="w-full">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        role={linhas.some((l) => l.medidor) ? "group" : "img"}
        aria-label={rotulo}
        className="block h-auto w-full overflow-visible"
      >
        {linhas.map((l, i) => {
          const y = i * rh + 4;
          const bw =
            ((W - rotuloLargura - direita) * Math.max(l.valor, 0)) / mx;
          const texto = l.nota ?? eixo(formato, l.valor);
          return (
            <g
              key={l.rotulo}
              role={l.medidor ? "meter" : undefined}
              aria-label={l.medidor?.nome}
              aria-valuemin={l.medidor ? 0 : undefined}
              aria-valuemax={l.medidor ? 100 : undefined}
              aria-valuenow={l.medidor?.agora ?? undefined}
            >
              <text
                className="fill-tinta font-sans text-[10px]"
                x={rotuloLargura - 7}
                y={y + 13}
                textAnchor="end"
              >
                {l.rotulo}
              </text>
              <rect
                x={rotuloLargura}
                y={y + 3}
                width={W - rotuloLargura - direita}
                height={13}
                rx={6.5}
                fill="var(--areia-clara)"
              />
              <rect
                className="grafico-largura hover:brightness-110"
                x={rotuloLargura}
                y={y + 3}
                width={Math.max(bw, 2).toFixed(1)}
                height={13}
                rx={6.5}
                fill={COR[l.tom ?? "dourado"]}
                style={{ animationDelay: `${i * 60}ms` }}
              >
                <title>{`${l.rotulo}: ${l.nota ?? dica(formato, l.valor)}`}</title>
              </rect>
              <text
                className="fill-tinta font-mono text-[9.5px]"
                x={W - 4}
                y={y + 13}
                textAnchor="end"
              >
                {texto}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

export interface FatiaMock {
  rotulo: string;
  valor: number;
  tom: TomMock;
}

/** Rosca com número no centro e legenda de nomes (`chDonut`). */
export function RoscaMock({
  fatias,
  centro,
  sub,
  formato = "numero",
  tamanho = 168,
  rotulo,
}: {
  fatias: FatiaMock[];
  centro?: string;
  sub?: string;
  formato?: FormatoMock;
  tamanho?: number;
  rotulo: string;
}) {
  const S = tamanho;
  const r = 62;
  const c = S / 2;
  const cir = 2 * Math.PI * r;
  const total = Math.max(
    fatias.reduce((a, f) => a + f.valor, 0),
    1,
  );
  return (
    <div>
      <svg
        viewBox={`0 0 ${S} ${S}`}
        role="img"
        aria-label={`${rotulo}: ${fatias.map((f) => `${f.rotulo} ${dica(formato, f.valor)}`).join(", ")}`}
        className="mx-auto block h-auto w-full"
        style={{ maxWidth: S }}
      >
        <circle
          cx={c}
          cy={c}
          r={r}
          fill="none"
          stroke="var(--areia-clara)"
          strokeWidth={20}
        />
        {fatias.map((f, i) => {
          const len = (cir * f.valor) / total;
          const inicio = fatias
            .slice(0, i)
            .reduce((a, x) => a + (cir * x.valor) / total, 0);
          return (
            <circle
              key={f.rotulo}
              className="grafico-arco"
              cx={c}
              cy={c}
              r={r}
              fill="none"
              stroke={COR[f.tom]}
              strokeWidth={20}
              strokeDasharray={`${len.toFixed(1)} ${(cir - len).toFixed(1)}`}
              strokeDashoffset={(-inicio).toFixed(1)}
              transform={`rotate(-90 ${c} ${c})`}
              style={
                {
                  "--circunferencia": cir,
                  animationDelay: `${i * 110}ms`,
                } as React.CSSProperties
              }
            >
              <title>{`${f.rotulo}: ${dica(formato, f.valor)} (${Math.round((f.valor / total) * 100)}%)`}</title>
            </circle>
          );
        })}
        {centro ? (
          <text
            x={c}
            y={c - 2}
            textAnchor="middle"
            className="fill-tinta font-titulo text-[26px] font-light"
          >
            {centro}
          </text>
        ) : null}
        {sub ? (
          <text
            x={c}
            y={c + 15}
            textAnchor="middle"
            className="fill-tinta-50 font-sans text-[9px]"
          >
            {sub}
          </text>
        ) : null}
      </svg>
      <Legenda series={fatias.map((f) => ({ nome: f.rotulo, tom: f.tom }))} />
    </div>
  );
}

export interface EtapaMock {
  rotulo: string;
  valor: number;
  tom?: TomMock;
}

/** Funil com a conversão de cada etapa (`chFunnel`). */
export function FunilMock({
  etapas,
  rotulo,
  larguraInicial = 520,
}: {
  etapas: EtapaMock[];
  rotulo: string;
  larguraInicial?: number;
}) {
  const [ref, W] = useLargura(larguraInicial);
  const sh = 44;
  const H = etapas.length * sh + 4;
  const mx = Math.max(etapas[0]?.valor ?? 0, 1);
  return (
    <div ref={ref} className="w-full">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        role="img"
        aria-label={`${rotulo}: ${etapas.map((e) => `${e.rotulo} ${e.valor}`).join(", ")}`}
        className="block h-auto w-full overflow-visible"
      >
        {etapas.map((s, i) => {
          const w = ((W - 150) * s.valor) / mx;
          const y = i * sh + 4;
          const anterior = etapas[i - 1];
          return (
            <g key={s.rotulo}>
              <rect
                className="grafico-largura"
                x={130}
                y={y}
                width={Math.max(w, 3).toFixed(1)}
                height={30}
                rx={4}
                fill={COR[s.tom ?? "dourado"]}
                style={{ animationDelay: `${i * 90}ms` }}
              >
                <title>{`${s.rotulo}: ${s.valor}`}</title>
              </rect>
              <text
                className="fill-tinta font-sans text-[10.5px] font-medium"
                x={123}
                y={y + 19}
                textAnchor="end"
              >
                {s.rotulo}
              </text>
              <text
                className="fill-tinta font-titulo text-[15px]"
                x={136 + Math.max(w, 3)}
                y={y + 19}
              >
                {s.valor}
              </text>
              {anterior && anterior.valor > 0 ? (
                <text
                  className={TEXTO_EIXO}
                  x={W - 4}
                  y={y + 19}
                  textAnchor="end"
                >
                  {Math.round((s.valor / anterior.valor) * 100)}%
                </text>
              ) : null}
            </g>
          );
        })}
      </svg>
    </div>
  );
}

/** Medidor em meia-lua (`chGauge`). `valor` de 0 a 100. */
export function MedidorMock({
  valor,
  legenda,
  tom = "dourado",
  rotulo,
}: {
  valor: number;
  legenda?: string;
  tom?: TomMock;
  rotulo: string;
}) {
  const cx = 75;
  const cy = 84;
  const r = 58;
  const arco = (a1: number, a2: number) => {
    const p1 = [cx + r * Math.cos(a1), cy + r * Math.sin(a1)];
    const p2 = [cx + r * Math.cos(a2), cy + r * Math.sin(a2)];
    return `M${p1[0]!.toFixed(1)} ${p1[1]!.toFixed(1)} A${r} ${r} 0 ${a2 - a1 > Math.PI ? 1 : 0} 1 ${p2[0]!.toFixed(1)} ${p2[1]!.toFixed(1)}`;
  };
  const v = Math.min(Math.max(valor, 0), 100) / 100;
  return (
    <svg
      viewBox="0 0 150 100"
      role="img"
      aria-label={rotulo}
      className="mx-auto block h-auto w-full max-w-[190px]"
    >
      <path
        d={arco(Math.PI, 2 * Math.PI)}
        fill="none"
        stroke="var(--areia-clara)"
        strokeWidth={15}
        strokeLinecap="round"
      />
      {v > 0 ? (
        <path
          className="grafico-revelar"
          d={arco(Math.PI, Math.PI + Math.PI * v)}
          fill="none"
          stroke={COR[tom]}
          strokeWidth={15}
          strokeLinecap="round"
        />
      ) : null}
      <text
        x={cx}
        y={cy - 8}
        textAnchor="middle"
        className="fill-tinta font-titulo text-[32px] font-light"
      >
        {String(Math.round(valor * 10) / 10).replace(".", ",")}
        <tspan className="text-[14px]">%</tspan>
      </text>
      {legenda ? (
        <text
          x={cx}
          y={cy + 12}
          textAnchor="middle"
          className="fill-tinta-50 font-sans text-[9.5px]"
        >
          {legenda}
        </text>
      ) : null}
    </svg>
  );
}

/** Mini linha do indicador (`chSpark`): 140 x 34, como no mockup. */
export function MiniLinhaMock({
  valores,
  tom = "dourado",
  rotulo,
}: {
  valores: number[];
  tom?: TomMock;
  rotulo: string;
}) {
  const W = 140;
  const H = 34;
  if (valores.length < 2) {
    // Sem série para desenhar: mantém a altura do bloco, igual ao mockup.
    return <div aria-hidden="true" className="h-[34px]" />;
  }
  const mx = Math.max(...valores);
  const mn = Math.min(...valores);
  const rg = mx - mn || 1;
  const pts = valores.map(
    (v, i) =>
      [
        i * (W / (valores.length - 1)),
        H - 4 - ((H - 10) * (v - mn)) / rg,
      ] as const,
  );
  const p = pts
    .map((q, i) => `${i ? "L" : "M"}${q[0].toFixed(1)} ${q[1].toFixed(1)}`)
    .join(" ");
  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      role="img"
      aria-label={rotulo}
      className="block h-[34px] w-full overflow-visible"
    >
      <path d={`${p} L${W} ${H} L0 ${H} Z`} fill={COR[tom]} opacity={0.14} />
      <path
        className="grafico-revelar"
        d={p}
        fill="none"
        stroke={COR[tom]}
        strokeWidth={1.6}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
