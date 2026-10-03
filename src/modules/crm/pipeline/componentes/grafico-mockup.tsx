import * as React from "react";

/**
 * Desenho dos gráficos do mockup da Camila (`chBars` e `chHBars`), em SVG
 * puro. Cores são variáveis do tema (nunca hexadecimal).
 */

export function CabecalhoGrafico({
  titulo,
  legenda,
}: {
  titulo: string;
  legenda: string;
}) {
  return (
    <div className="mb-3 flex items-baseline gap-[9px]">
      <h2 className="font-sans text-[13px] font-semibold">{titulo}</h2>
      <span className="text-tinta-50 text-[11px]">{legenda}</span>
    </div>
  );
}

const ROTULO = "fill-tinta-50 font-sans text-[10px]";
const EIXO = "fill-tinta-50 font-mono text-[9px]";

function maximoLimpo(v: number): number {
  if (v <= 0) return 1;
  const base = 10 ** Math.floor(Math.log10(v));
  const f = v / base;
  return (f <= 1 ? 1 : f <= 2 ? 2 : f <= 5 ? 5 : 10) * base;
}

export interface DadoBarra {
  rotulo: string;
  valor: number;
}

/** `chBars` com uma série: colunas de raio 2,5 e grade de 4 divisões. */
export function BarrasMockup({
  dados,
  cor,
  descricao,
  altura = 170,
}: {
  dados: DadoBarra[];
  cor: string;
  descricao: string;
  altura?: number;
}) {
  const W = 520;
  const [L, R, T, B] = [34, 8, 10, 24];
  const iw = W - L - R;
  const ih = altura - T - B;
  const teto = maximoLimpo(Math.max(...dados.map((d) => d.valor), 1) * 1.12);
  const gw = iw / dados.length;
  const bw = gw * 0.62;
  return (
    <svg
      viewBox={`0 0 ${W} ${altura}`}
      role="img"
      aria-label={descricao}
      className="block h-auto w-full overflow-visible"
    >
      {[0, 1, 2, 3, 4].map((g) => {
        const y = T + ih - (ih * g) / 4;
        return (
          <g key={g}>
            <line
              x1={L}
              x2={W - R}
              y1={y}
              y2={y}
              stroke="var(--fio-3)"
              strokeWidth=".6"
            />
            <text x={L - 5} y={y + 3} textAnchor="end" className={EIXO}>
              {Math.round((teto * g) / 4)}
            </text>
          </g>
        );
      })}
      {dados.map((d, i) => {
        const h = (ih * d.valor) / teto;
        const cx = L + gw * i + gw / 2;
        return (
          <g key={d.rotulo}>
            <rect
              x={cx - bw / 2}
              y={T + ih - h}
              width={bw - 1.5}
              height={Math.max(h, 0.6)}
              rx="2.5"
              fill={cor}
            >
              <title>{`${d.rotulo}: ${d.valor}`}</title>
            </rect>
            <text x={cx} y={altura - 8} textAnchor="middle" className={ROTULO}>
              {d.rotulo}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

export interface DadoBarraH {
  rotulo: string;
  valor: number;
  cor: string;
}

/** `chHBars`: trilha de 13 px, barra em pílula, valor à direita. */
export function BarrasHorizontaisMockup({
  dados,
  descricao,
  larguraRotulo = 142,
}: {
  dados: DadoBarraH[];
  descricao: string;
  larguraRotulo?: number;
}) {
  const [W, rh, R] = [520, 26, 44];
  const L = larguraRotulo;
  const H = dados.length * rh + 6;
  const teto = Math.max(...dados.map((d) => d.valor), 1) * 1.02;
  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      role="img"
      aria-label={descricao}
      className="block h-auto w-full overflow-visible"
    >
      {dados.map((d, i) => {
        const y = i * rh + 4;
        const larg = ((W - L - R) * d.valor) / teto;
        return (
          <g key={d.rotulo}>
            <text
              x={L - 7}
              y={y + 13}
              textAnchor="end"
              className="fill-tinta font-sans text-[10px]"
            >
              {d.rotulo}
            </text>
            <rect
              x={L}
              y={y + 3}
              width={W - L - R}
              height="13"
              rx="6.5"
              fill="var(--areia-clara)"
            />
            <rect
              x={L}
              y={y + 3}
              width={Math.max(larg, 2)}
              height="13"
              rx="6.5"
              fill={d.cor}
            >
              <title>{`${d.rotulo}: ${d.valor}`}</title>
            </rect>
            <text
              x={W - 4}
              y={y + 13}
              textAnchor="end"
              className="fill-tinta font-mono text-[9.5px]"
            >
              {d.valor}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
