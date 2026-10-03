import * as React from "react";
import { cn } from "@/lib/utils";
import { Kpi } from "@/components/mockup";

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

/** Indicadores no desenho do mockup (`.grid.g4` de `.kpi`): rótulo, número em Jost leve e comparação. */
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
      className="tablet:grid-cols-2 grid grid-cols-1 gap-3.5 lg:grid-cols-4"
    >
      {itens.map((i) => (
        <li key={i.rotulo} className="flex">
          <Kpi
            className="flex-1"
            rotulo={i.rotulo}
            valor={i.valor}
            delta={i.contexto}
          />
        </li>
      ))}
    </ul>
  );
}

/** `.chart-h`: título em 13 px 600 com a nota ao lado. */
export function CabecalhoGrafico({
  titulo,
  nota,
}: {
  titulo: string;
  nota?: string;
}) {
  return (
    <div className="mb-3 flex flex-wrap items-baseline gap-x-[9px]">
      <b className="text-[13px] font-semibold">{titulo}</b>
      {nota ? <span className="text-tinta-50 text-[11px]">{nota}</span> : null}
    </div>
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

const FUNDOS_AVATAR = [
  "bg-dourado-medio",
  "bg-azul-medio",
  "bg-salvia-media",
  "bg-lavanda-media",
  "bg-argila-media",
] as const;

/** Mesmo nome, mesma cor: a cor vem das letras, não de sorteio. */
function fundoDoAvatar(nome: string) {
  let soma = 0;
  for (const c of nome) soma += c.codePointAt(0) ?? 0;
  return FUNDOS_AVATAR[soma % FUNDOS_AVATAR.length]!;
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
        "text-marinho font-titulo text-apoio inline-flex size-10 flex-none items-center justify-center rounded-full font-medium",
        fundoDoAvatar(nome),
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
