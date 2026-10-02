import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * Peças comuns do Banco de talentos e do Pós-venda, no mesmo acabamento do
 * Início de gestão: faixa de indicadores com comparação ao lado (nenhum
 * número sozinho), avatar de iniciais e cabeçalho de bloco. Só tokens do tema.
 */

export interface ItemFaixa {
  rotulo: string;
  valor: React.ReactNode;
  /** Comparação ou próximo passo, em frase. */
  contexto: string;
  /** Um indicador por faixa pode levar o fio dourado. */
  destaque?: boolean;
}

export function FaixaResumo({
  itens,
  rotulo,
}: {
  itens: ItemFaixa[];
  rotulo: string;
}) {
  return (
    <ul
      aria-label={rotulo}
      className="tablet:grid-cols-2 grid grid-cols-1 gap-3 lg:grid-cols-4"
    >
      {itens.map((i) => (
        <li
          key={i.rotulo}
          className={cn(
            "rounded-3 border-linha bg-superficie flex min-h-[44px] flex-col gap-2 border p-4",
            i.destaque && "border-t-dourado border-t-[3px]",
          )}
        >
          <span className="text-apoio text-texto-2 font-medium">
            {i.rotulo}
          </span>
          <span className="font-titulo text-numero text-texto font-medium tabular-nums">
            {i.valor}
          </span>
          <span className="border-linha text-apoio text-texto-2 mt-auto border-t pt-2">
            {i.contexto}
          </span>
        </li>
      ))}
    </ul>
  );
}

export function iniciais(nome: string) {
  const partes = nome.trim().split(/\s+/).filter(Boolean);
  const duas = [partes[0], partes.length > 1 ? partes[partes.length - 1] : ""];
  return duas
    .map((x) => (x ? Array.from(x)[0] : ""))
    .join("")
    .toLocaleUpperCase("pt-BR");
}

export function Avatar({
  nome,
  className,
}: {
  nome: string;
  className?: string;
}) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "bg-areia text-marinho font-titulo text-apoio inline-flex size-10 flex-none items-center justify-center rounded-full font-medium",
        className,
      )}
    >
      {iniciais(nome)}
    </span>
  );
}

/** Bloco da ficha: cartão branco com fio fino e cabeçalho em areia clara. */
export function BlocoFicha({
  id,
  titulo,
  nota,
  children,
}: {
  id: string;
  titulo: string;
  nota?: string;
  children: React.ReactNode;
}) {
  return (
    <section
      aria-labelledby={id}
      className="rounded-3 border-linha bg-superficie flex flex-col overflow-hidden border"
    >
      <div className="bg-areia-clara border-linha flex flex-col gap-0.5 border-b px-5 py-3">
        <h2 id={id} className="font-titulo text-2 text-texto">
          {titulo}
        </h2>
        {nota ? <p className="text-apoio text-texto-2">{nota}</p> : null}
      </div>
      <div className="flex flex-col gap-4 p-5">{children}</div>
    </section>
  );
}
