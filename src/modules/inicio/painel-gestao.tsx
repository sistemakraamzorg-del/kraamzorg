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
import {
  AnelProgresso,
  type EstadoSegmento,
} from "@/components/ui/anel-progresso";
import { type Tom } from "@/components/ui/tons";
import { cn } from "@/lib/utils";

/**
 * Peças visuais do Início de gestão (mockup da Drop, v4.5, com o jeito
 * acolhedor do app): faixa do dia, indicadores em tom de apoio com mini
 * gráfico, e painéis de gráfico com cabeçalho em tom. Só tokens do tema;
 * os gráficos vêm de `@/components/graficos`.
 */

export function FaixaDoDia({
  saudacao,
  titulo,
  frase,
}: {
  saudacao: string;
  titulo: React.ReactNode;
  frase?: React.ReactNode;
}) {
  return (
    <header className="rounded-3 border-linha bg-superficie mt-3 border border-t-[3px] border-t-dourado px-5 py-5 lg:mt-6 lg:px-8 lg:py-6">
      <p className="text-apoio text-texto-2 font-medium">{saudacao}</p>
      <h1 className="font-titulo text-display lg:text-display-lg text-texto mt-1 font-normal">
        {titulo}
      </h1>
      {frase ? (
        <p className="text-3 text-texto-2 mt-2 max-w-[60ch]">{frase}</p>
      ) : null}
    </header>
  );
}

export interface Indicador {
  rotulo: string;
  valor: React.ReactNode;
  /** Comparação ou próximo passo, em frase ("2 a menos que em setembro"). */
  contexto: string;
  href: string;
  tom: Tom;
  /** Série curta para o mini gráfico; sem ela, o cartão fica só com o número. */
  serie?: number[];
  rotuloSerie?: string;
  tomGrafico?: TomGrafico;
}

export function GradeIndicadores({ itens }: { itens: Indicador[] }) {
  return (
    <ul className="tablet:grid-cols-2 mt-6 grid grid-cols-1 gap-3 lg:grid-cols-4">
      {itens.map((i) => (
        <li key={i.rotulo}>
          <Link
            href={i.href}
            className="rounded-3 border-linha bg-superficie ease-estado hover:border-dourado flex h-full min-h-[44px] flex-col gap-2 border p-4 text-inherit no-underline transition-colors duration-140"
          >
            <span className="text-apoio text-texto-2 font-medium">
              {i.rotulo}
            </span>
            <span className="font-titulo text-numero text-texto font-medium tabular-nums">
              {i.valor}
            </span>
            {i.serie && i.serie.length > 1 ? (
              <Sparkline
                valores={i.serie}
                tom={i.tomGrafico}
                rotulo={i.rotuloSerie ?? i.rotulo}
              />
            ) : null}
            <span className="border-linha text-apoio text-texto-2 mt-auto border-t pt-2">
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
        "mt-6 grid grid-cols-1 gap-4",
        colunas === 3 ? "lg:grid-cols-3" : "lg:grid-cols-2",
      )}
    >
      {children}
    </div>
  );
}

/** Painel de gráfico: cartão branco com fio fino; cabeçalho em areia clara. */
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
  /** Como ler o gráfico, em uma frase. */
  leitura?: string;
  /** @deprecated o cabeçalho é sempre neutro; mantido para não quebrar chamadas. */
  tom?: Tom;
  /** Mensagem gentil quando não há dado para desenhar. */
  vazio?: string;
  children?: React.ReactNode;
}) {
  return (
    <section className="rounded-3 border-linha bg-superficie flex flex-col overflow-hidden border">
      <div className="bg-areia-clara border-linha flex flex-col gap-0.5 border-b px-5 py-3">
        <h2 className="font-titulo text-2 text-texto">{titulo}</h2>
        {nota ? <p className="text-apoio text-texto-2">{nota}</p> : null}
        {leitura ? <p className="text-apoio text-texto-3">{leitura}</p> : null}
      </div>
      <div className="flex flex-1 flex-col justify-center p-5">
        {vazio ? (
          <div className="flex items-center gap-3">
            <Broto tamanho={64} sobre="branco" />
            <p className="text-apoio text-texto-2">{vazio}</p>
          </div>
        ) : (
          children
        )}
      </div>
    </section>
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
