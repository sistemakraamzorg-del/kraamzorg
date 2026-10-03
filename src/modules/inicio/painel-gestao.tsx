import * as React from "react";
import Link from "next/link";
import {
  BarrasHorizontais,
  Colunas,
  Rosca,
  Sparkline,
  type TomGrafico,
} from "@/components/graficos";
import { Broto } from "@/components/ilustracoes";
import { Card, CardHead, Nota } from "@/components/mockup";
import { CabecalhoTela } from "@/components/shell/cabecalho-tela";
import {
  AnelProgresso,
  type EstadoSegmento,
} from "@/components/ui/anel-progresso";
import type { Tom } from "@/components/ui/tons";
import { cn } from "@/lib/utils";

/**
 * Peças visuais do Início no desenho do HTML da cliente (`#v-home`): faixa
 * do dia (`.note`), indicadores (`.kpi` com mini gráfico), grades `.g4`,
 * `.g3` e `.g2`, painéis de gráfico (`.card` com `.chart-h`), listas
 * (`.list-i`) e a divisão `.split`. Só tokens do tema; os gráficos vêm de
 * `@/components/graficos`. Sem dado, o painel diz o que vai aparecer ali.
 */

export function FaixaDoDia({
  saudacao,
  frase,
}: {
  saudacao: string;
  frase?: React.ReactNode;
}) {
  return (
    <>
      <CabecalhoTela titulo="Início" />
      <Nota className="mt-4 mb-4 lg:mt-[22px]">
        <b>{saudacao}.</b> {frase}
      </Nota>
    </>
  );
}

export interface Indicador {
  rotulo: string;
  valor: React.ReactNode;
  /** Comparação ou próximo passo, em frase ("2 a menos que em setembro"). */
  contexto: string;
  href: string;
  /** Mantido por compatibilidade com as telas; o visual do mockup não usa tom no cartão. */
  tom?: Tom;
  /** Série curta para o mini gráfico; sem ela, o cartão fica só com o número. */
  serie?: number[];
  rotuloSerie?: string;
  tomGrafico?: TomGrafico;
}

const COR_SPARK: Partial<Record<TomGrafico, string>> = {
  sucesso: "var(--sucesso)",
  aviso: "var(--aviso)",
  alerta: "var(--alerta)",
  marinho: "var(--marinho)",
};

/** Mini gráfico do `.kpi` (`chSpark`): área a 14% e linha de 1,6 px, normalizado entre mínimo e máximo. */
function MiniGrafico({
  valores,
  tom,
  rotulo,
}: {
  valores: number[];
  tom?: TomGrafico;
  rotulo: string;
}) {
  const W = 140;
  const H = 34;
  const max = Math.max(...valores);
  const min = Math.min(...valores);
  const faixa = max - min || 1;
  const pontos = valores.map(
    (v, i) =>
      [
        i * (W / (valores.length - 1)),
        H - 4 - ((H - 10) * (v - min)) / faixa,
      ] as const,
  );
  const linha = pontos
    .map(([x, y], i) => `${i ? "L" : "M"}${x.toFixed(1)} ${y.toFixed(1)}`)
    .join(" ");
  const cor = (tom && COR_SPARK[tom]) ?? "var(--dourado)";
  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      preserveAspectRatio="none"
      role="img"
      aria-label={rotulo}
      className="mt-1.5 block h-[34px] w-full overflow-visible"
    >
      <path d={`${linha} L${W} ${H} L0 ${H} Z`} fill={cor} opacity="0.14" />
      <path
        d={linha}
        fill="none"
        stroke={cor}
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}

export function GradeIndicadores({ itens }: { itens: Indicador[] }) {
  return (
    <ul className="tablet:grid-cols-2 mb-[14px] grid grid-cols-1 gap-[14px] lg:grid-cols-4">
      {itens.map((i) => (
        <li key={i.rotulo}>
          <Link
            href={i.href}
            className="rounded-3 border-linha bg-superficie shadow-1 ease-estado hover:border-fio-2 focus-visible:outline-dourado block h-full min-h-[44px] border px-4 py-[15px] text-inherit no-underline transition-colors duration-140"
          >
            <span className="text-tinta-50 block text-[11px] font-semibold tracking-[0.09em] uppercase">
              {i.rotulo}
            </span>
            <span className="font-titulo mt-[7px] block text-[33px] leading-[1.1] font-light tracking-[-0.02em] tabular-nums">
              {i.valor}
            </span>
            {i.serie && i.serie.length > 1 ? (
              <MiniGrafico
                valores={i.serie}
                tom={i.tomGrafico}
                rotulo={i.rotuloSerie ?? i.rotulo}
              />
            ) : null}
            <span className="text-tinta-50 mt-[5px] block text-[11.5px]">
              {i.contexto}
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}

export function GradeGraficos({
  children,
  colunas = 3,
}: {
  children: React.ReactNode;
  colunas?: 2 | 3;
}) {
  return (
    <div
      className={cn(
        "mb-[14px] grid grid-cols-1 gap-[14px]",
        colunas === 3 ? "lg:grid-cols-3" : "lg:grid-cols-2",
      )}
    >
      {children}
    </div>
  );
}

/** Painel de gráfico (`.card` com `.chart-h`): título em 13 px, nota ao lado, gráfico embaixo. */
export function PainelGrafico({
  titulo,
  nota,
  leitura,
  vazio,
  children,
}: {
  titulo: string;
  /** O que o gráfico mostra (subtítulo). */
  nota?: string;
  /** Como ler o gráfico, em uma frase (lida por leitor de tela). */
  leitura?: string;
  /** Tom de apoio do cabeçalho; o visual do mockup não usa. */
  tom?: Tom;
  /** Mensagem gentil quando não há dado para desenhar. */
  vazio?: string;
  children?: React.ReactNode;
}) {
  return (
    <section className="rounded-3 border-linha bg-superficie shadow-1 flex flex-col border">
      <div className="flex flex-1 flex-col p-4">
        <div className="mb-3 flex flex-wrap items-baseline gap-x-[9px]">
          <h2 className="text-[13px] font-semibold">{titulo}</h2>
          {nota ? (
            <span className="text-tinta-50 text-[11px]">{nota}</span>
          ) : null}
        </div>
        {leitura ? <p className="sr-only">{leitura}</p> : null}
        {vazio ? (
          <div className="flex items-center gap-3">
            <Broto tamanho={56} sobre="branco" />
            <p className="text-tinta-70 text-[12.5px] leading-normal">
              {vazio}
            </p>
          </div>
        ) : (
          children
        )}
      </div>
    </section>
  );
}

/** Funil do mockup (`chFunnel`): barras sólidas, valor em Jost e conversão sobre a etapa anterior. */
export function Funil({
  rotulo,
  etapas,
}: {
  rotulo: string;
  etapas: { rotulo: string; valor: number; tom: TomGrafico }[];
}) {
  const max = Math.max(etapas[0]?.valor ?? 0, 1);
  const COR: Record<string, string> = {
    dourado: "var(--dourado-2)",
    aviso: "var(--dourado)",
    marinho: "var(--marinho-3)",
    sucesso: "var(--sucesso)",
  };
  return (
    <ul
      aria-label={`${rotulo}: ${etapas.map((e) => `${e.rotulo} ${e.valor}`).join(", ")}`}
      className="flex flex-col gap-3.5"
    >
      {etapas.map((e, i) => {
        const anterior = etapas[i - 1]?.valor;
        return (
          <li key={e.rotulo} className="flex items-center gap-2.5">
            <span className="w-[6.5rem] shrink-0 text-right text-[10.5px] leading-tight font-medium">
              {e.rotulo}
            </span>
            <span className="flex min-w-0 flex-1 items-center gap-1.5">
              <i
                aria-hidden="true"
                className="block h-[30px] rounded-[4px]"
                style={{
                  width: `max(3px, ${(e.valor / max) * 75}%)`,
                  background: COR[e.tom] ?? "var(--dourado-2)",
                }}
              />
              <span className="font-titulo text-[15px]">{e.valor}</span>
            </span>
            {anterior ? (
              <span className="text-tinta-50 w-9 shrink-0 text-right font-mono text-[9px]">
                {Math.round((e.valor / anterior) * 100)}%
              </span>
            ) : (
              <span className="w-9 shrink-0" />
            )}
          </li>
        );
      })}
    </ul>
  );
}

/** Divisão `.split`: coluna principal e coluna lateral de 340 px. */
export function Divisao({
  principal,
  lateral,
}: {
  principal: React.ReactNode;
  lateral: React.ReactNode;
}) {
  return (
    <div className="grid grid-cols-1 items-start gap-[14px] lg:grid-cols-[minmax(0,1fr)_340px]">
      <div className="flex min-w-0 flex-col gap-[14px]">{principal}</div>
      <div className="flex min-w-0 flex-col gap-[14px]">{lateral}</div>
    </div>
  );
}

/** Cartão com cabeçalho (`.card` + `.card-h`). */
export function CartaoLista({
  titulo,
  direita,
  children,
}: {
  titulo: string;
  direita?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <Card>
      <CardHead titulo={titulo} direita={direita} />
      {children}
    </Card>
  );
}

type TomIcone = "alerta" | "aviso" | "sucesso" | "dourado" | "sensivel";

const ICONE_TOM: Record<TomIcone, string> = {
  alerta: "bg-alerta-lavado text-alerta-texto",
  aviso: "bg-aviso-lavado text-aviso-texto",
  sucesso: "bg-sucesso-lavado text-sucesso-texto",
  dourado: "bg-dourado-lavado text-dourado-texto",
  sensivel: "bg-sensivel-lavado text-sensivel-texto",
};

/** Linha de lista (`.list-i`): ícone quadrado, texto com apoio e marca de tempo. */
export function LinhaLista({
  href,
  icone,
  tom,
  titulo,
  apoio,
  tempo,
}: {
  href: string;
  icone: React.ReactNode;
  tom: TomIcone;
  titulo: React.ReactNode;
  apoio?: React.ReactNode;
  tempo?: React.ReactNode;
}) {
  return (
    <li className="border-fio-3 border-b last:border-b-0">
      <Link
        href={href}
        className="ease-estado hover:bg-creme-2 flex min-h-[44px] items-start gap-[11px] px-4 py-[11px] text-inherit no-underline transition-colors duration-140"
      >
        <span
          aria-hidden="true"
          className={cn(
            "grid size-[26px] shrink-0 place-items-center rounded-[7px] [&>svg]:size-3.5",
            ICONE_TOM[tom],
          )}
        >
          {icone}
        </span>
        <span className="min-w-0 flex-1 text-[12.5px] leading-normal">
          {titulo}
          {apoio ? (
            <span className="text-tinta-50 mt-[3px] block text-[11.5px]">
              {apoio}
            </span>
          ) : null}
        </span>
        {tempo ? (
          <span className="text-tinta-50 shrink-0 font-mono text-[10.5px]">
            {tempo}
          </span>
        ) : null}
      </Link>
    </li>
  );
}

/** Anel da meta de contratos: um segmento por contrato da meta. */
export function AnelMeta({ feitos, meta }: { feitos: number; meta: number }) {
  // Acima de 24 segmentos o anel vira serrilha; nesse caso, só o número.
  if (meta < 1 || meta > 24) return null;
  const segmentos: EstadoSegmento[] = Array.from({ length: meta }, (_, i) =>
    i < feitos ? "feito" : i === feitos ? "atual" : "futuro",
  );
  return (
    <div className="flex items-center gap-4">
      <AnelProgresso
        segmentos={segmentos}
        tamanho={96}
        centro={
          <span className="font-titulo text-3 text-texto tabular-nums">
            {feitos}/{meta}
          </span>
        }
      />
      <p className="text-corpo text-texto">
        {feitos >= meta
          ? "A meta de contratos do mês foi batida. Que bom."
          : `Faltam ${meta - feitos} ${meta - feitos === 1 ? "contrato" : "contratos"} para a meta do mês.`}
      </p>
    </div>
  );
}

export { BarrasHorizontais, Colunas, Rosca, Sparkline };
