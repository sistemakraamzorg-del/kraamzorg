import * as React from "react";
import Link from "next/link";
import { Card, CardBody, CardHead, classesChip } from "@/components/mockup";
import { Selo, type SeloProps } from "@/components/ui/selo";
import { cn } from "@/lib/utils";

/**
 * Peças de página das telas de gestão (Indicadores, Marketing, Financeiro e
 * Cobranças) no desenho do HTML de referência da cliente: `.grid g2/g3/g4`,
 * `.chart-h`, tabela, `.tag`. Os componentes de cartão vêm de
 * `@/components/mockup`.
 */

/** `.grid.g4`, `.g3`, `.g2`: grade de 14 px que empilha no celular. */
export function Grade({
  colunas,
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement> & { colunas: 2 | 3 | 4 }) {
  return (
    <div
      className={cn(
        "grid grid-cols-1 gap-3.5",
        colunas === 2 && "min-[900px]:grid-cols-2",
        colunas === 3 && "min-[900px]:grid-cols-3",
        colunas === 4 && "min-[560px]:grid-cols-2 min-[1100px]:grid-cols-4",
        className,
      )}
      {...props}
    />
  );
}

/** Cartão de gráfico: `.card > .card-b` com `.chart-h` (título em 13 px e nota). */
export function CartaoGrafico({
  titulo,
  nota,
  children,
  className,
}: {
  titulo: string;
  nota?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <Card className={className}>
      <CardBody>
        <div className="mb-3 flex items-baseline gap-[9px]">
          <h3 className="text-[13px] font-semibold">{titulo}</h3>
          {nota ? (
            <span className="text-tinta-50 text-[11px]">{nota}</span>
          ) : null}
        </div>
        {children}
      </CardBody>
    </Card>
  );
}

/** `.kpi` com a mini linha entre o número e a variação (a do app não tem lugar para ela). */
export function KpiLinha({
  rotulo,
  valor,
  unidade,
  grafico,
  delta,
  tomDelta = "neutro",
  className,
}: {
  rotulo: React.ReactNode;
  valor: React.ReactNode;
  unidade?: React.ReactNode;
  grafico?: React.ReactNode;
  delta?: React.ReactNode;
  tomDelta?: "ok" | "alerta" | "neutro";
  className?: string;
}) {
  return (
    <Card className={cn("px-4 py-[15px]", className)}>
      <div className="text-tinta-50 text-[11px] font-semibold tracking-[0.09em] uppercase">
        {rotulo}
      </div>
      <div className="font-titulo mt-[7px] text-[33px] leading-[1.1] font-light tracking-[-0.02em]">
        {valor}
        {unidade ? (
          <small className="text-tinta-50 ml-[3px] text-sm">{unidade}</small>
        ) : null}
      </div>
      {grafico}
      {delta ? (
        <div
          className={cn(
            "mt-[5px] text-[11.5px]",
            tomDelta === "ok" && "text-sucesso",
            tomDelta === "alerta" && "text-alerta",
            tomDelta === "neutro" && "text-tinta-50",
          )}
        >
          {delta}
        </div>
      ) : null}
    </Card>
  );
}

/** Texto de um bloco sem dado, no lugar do gráfico. */
export function SemDado({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-tinta-50 py-2 text-[11.5px] leading-[1.6]">{children}</p>
  );
}

/** Cartão com título (`.card-h`) e corpo sem recuo, para tabelas. */
export function BlocoTabela({
  id,
  titulo,
  direita,
  children,
  rodape,
  className,
}: {
  id?: string;
  titulo: React.ReactNode;
  direita?: React.ReactNode;
  children: React.ReactNode;
  rodape?: React.ReactNode;
  className?: string;
}) {
  return (
    <Card id={id} className={cn("scroll-mt-24", className)}>
      <CardHead titulo={titulo} direita={direita} />
      {children}
      {rodape ? (
        <CardBody className="border-linha border-t">{rodape}</CardBody>
      ) : null}
    </Card>
  );
}

/** Cartão de formulário ou de ação: título (`.card-h`), uma frase de apoio e o conteúdo. */
export function BlocoForm({
  id,
  titulo,
  nota,
  children,
  className,
}: {
  id?: string;
  titulo: React.ReactNode;
  nota?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <Card id={id} className={cn("scroll-mt-24", className)}>
      <CardHead titulo={titulo} />
      <CardBody className="flex flex-col gap-3">
        {nota ? (
          <p className="text-tinta-70 max-w-[64ch] text-[12.5px] leading-[1.6]">
            {nota}
          </p>
        ) : null}
        {children}
      </CardBody>
    </Card>
  );
}

/**
 * Classes para a `TabelaLista` ficar com a tabela do mockup no computador
 * (cabeçalho em caixa alta sobre creme, linhas de 11 px, número em mono de
 * 11,5 px). No celular a tabela continua virando lista de cartões.
 */
export const CLASSE_TABELA = [
  "[&_thead_th]:border-linha [&_thead_th]:bg-creme-2 [&_thead_th]:text-tinta-50 [&_thead_th]:px-4 [&_thead_th]:py-[9px] [&_thead_th]:text-[10px] [&_thead_th]:font-semibold [&_thead_th]:tracking-[0.11em] [&_thead_th]:uppercase",
  "min-[720px]:[&_td]:px-4 min-[720px]:[&_td]:py-[11px] min-[720px]:[&_td]:h-auto [&_td]:text-[13px] [&_td.font-mono]:text-[11.5px]",
  "[&_tbody_tr]:border-fio-3 min-[720px]:[&_tbody_tr:hover]:bg-creme-3 min-[720px]:[&_tbody_tr:last-child]:border-b-0",
].join(" ");

/** Cartão com tabela e nome de linha em semibold (`td .nm`). */
export const NOME = "font-semibold";
export const SUB = "text-tinta-50 text-[11.5px]";

/** `.tag`: pílula com ponto. */
export function SeloPonto({ children, ...props }: Omit<SeloProps, "icone">) {
  return (
    <Selo {...props}>
      <span
        aria-hidden="true"
        className="size-1.5 flex-none rounded-full bg-current"
      />
      {children}
    </Selo>
  );
}

/** Filtros e trocas de tela em botões do `.subnav`; cada item é um link. */
export function ChipsNav({
  rotulo,
  itens,
}: {
  rotulo: string;
  itens: { rotulo: string; href: string; ativo: boolean; contagem?: number }[];
}) {
  return (
    <nav aria-label={rotulo} className="flex flex-wrap gap-1.5">
      {itens.map((i) => (
        <Link
          key={i.rotulo}
          href={i.href}
          aria-current={i.ativo ? "page" : undefined}
          className={cn(
            classesChip(i.ativo),
            "min-h-toque ease-estado justify-center no-underline transition-colors duration-140 lg:min-h-8",
            !i.ativo && "hover:bg-creme-2",
          )}
        >
          {i.rotulo}
          {i.contagem !== undefined ? (
            <span className="font-mono text-[11.5px]">{i.contagem}</span>
          ) : null}
        </Link>
      ))}
    </nav>
  );
}
