import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * Primitivos do HTML de referência da cliente (Mockup Inicial HTML) [v4.7]:
 * `.card`, `.card-h`, `.card-b`, `.kpi`, `.eyebrow`, `.sec-title`, `.note`,
 * `.bar`, `.chip`, `.tag`, tabela. As medidas (em px) são a transcrição do
 * CSS dela, por isso aparecem como valores arbitrários só aqui. Quem monta
 * tela usa estes componentes e não repete número de tamanho.
 * Server-safe: nenhum hook.
 */

export function Card({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "rounded-3 border-linha bg-superficie shadow-1 border",
        className,
      )}
      {...props}
    />
  );
}

export function CardHead({
  titulo,
  direita,
  className,
}: {
  titulo: React.ReactNode;
  direita?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "border-linha flex items-center gap-2.5 border-b px-4 py-[13px]",
        className,
      )}
    >
      <h3 className="font-titulo text-[15.5px] font-normal tracking-[0.01em]">
        {titulo}
      </h3>
      {direita ? (
        <div className="text-tinta-50 ml-auto text-[11.5px]">{direita}</div>
      ) : null}
    </div>
  );
}

export function CardBody({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("p-4", className)} {...props} />;
}

/** Sobretítulo em caixa alta (`.eyebrow`). */
export function Eyebrow({
  className,
  ...props
}: React.HTMLAttributes<HTMLSpanElement>) {
  return (
    <span
      className={cn(
        "text-tinta-50 text-[10px] font-semibold tracking-[0.16em] uppercase",
        className,
      )}
      {...props}
    />
  );
}

/** Título de seção de página (`.sec-title`). */
export function TituloSecao({
  className,
  ...props
}: React.HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h2
      className={cn(
        "font-titulo mt-[26px] mb-3 text-[19px] font-light first:mt-0",
        className,
      )}
      {...props}
    />
  );
}

type TomDelta = "ok" | "alerta" | "neutro";

/** Indicador (`.kpi`): rótulo em caixa alta, número em Jost leve e variação. */
export function Kpi({
  rotulo,
  valor,
  unidade,
  delta,
  tomDelta = "neutro",
  className,
}: {
  rotulo: React.ReactNode;
  valor: React.ReactNode;
  unidade?: React.ReactNode;
  delta?: React.ReactNode;
  tomDelta?: TomDelta;
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

type TomNota = "dourado" | "sensivel" | "alerta";

/** Nota com filete na lateral (`.note`). */
export function Nota({
  tom = "dourado",
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement> & { tom?: TomNota }) {
  return (
    <div
      className={cn(
        "rounded-r-[8px] border-l-[3px] px-3.5 py-[11px] text-[12.5px] leading-[1.6]",
        tom === "dourado" &&
          "border-dourado bg-dourado-lavado text-dourado-texto",
        tom === "sensivel" &&
          "border-sensivel bg-sensivel-lavado text-sensivel-texto",
        tom === "alerta" && "border-alerta bg-alerta-lavado text-alerta-texto",
        className,
      )}
      {...props}
    />
  );
}

type TomBarra = "dourado" | "sucesso" | "aviso" | "alerta";

/** Barra de progresso fina (`.bar`). `valor` de 0 a 100. */
export function Barra({
  valor,
  tom = "dourado",
  rotulo,
  className,
}: {
  valor: number;
  tom?: TomBarra;
  rotulo: string;
  className?: string;
}) {
  const pct = Math.min(Math.max(valor, 0), 100);
  return (
    <div
      role="progressbar"
      aria-label={rotulo}
      aria-valuenow={Math.round(pct)}
      aria-valuemin={0}
      aria-valuemax={100}
      className={cn(
        "bg-areia-clara rounded-pilula h-1.5 overflow-hidden",
        className,
      )}
    >
      <i
        className={cn(
          "rounded-pilula block h-full",
          tom === "dourado" && "bg-dourado",
          tom === "sucesso" && "bg-sucesso",
          tom === "aviso" && "bg-aviso",
          tom === "alerta" && "bg-alerta",
        )}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

/** Botão pequeno do topo e dos filtros (`.chip`). `primario` = `.chip.gold` (marinho). */
export const classesChip = (primario = false) =>
  cn(
    "inline-flex items-center gap-1.5 rounded-[7px] border px-[11px] py-1.5 text-[12.5px]",
    primario
      ? "border-marinho bg-marinho font-medium text-texto-inverso"
      : "border-fio-2 bg-superficie text-tinta-70",
  );

/** Classes da tabela do mockup: aplique no <table>, <th>, <td>, <tr>. */
export const tabelaMock = {
  tabela: "w-full border-collapse",
  th: "border-b border-linha bg-creme-2 px-4 py-[9px] text-left text-[10px] font-semibold tracking-[0.11em] text-tinta-50 uppercase",
  td: "border-b border-fio-3 px-4 py-[11px] align-middle text-[13px]",
  tr: "last:[&>td]:border-b-0 hover:bg-creme-3",
  nome: "font-semibold",
  sub: "text-[11.5px] text-tinta-50",
} as const;
