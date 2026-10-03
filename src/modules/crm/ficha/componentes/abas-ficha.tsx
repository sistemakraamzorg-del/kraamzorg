import Link from "next/link";
import { cn } from "@/lib/utils";

/**
 * Abas de conteúdo da ficha (`.tabs` e `.tab` do mockup): sublinhado dourado
 * na aba ativa, coladas na base do cartão do cabeçalho. Continuam links numa
 * `nav` com `aria-current`, porque cada aba é um endereço (`?aba=`); rolam de
 * lado no celular. A aba que o papel não pode ver não aparece: quem chama já
 * filtra a lista.
 */
export interface AbaFicha {
  chave: string;
  rotulo: string;
}

export function AbasFicha({
  familiaId,
  abas,
  ativa,
}: {
  familiaId: string;
  abas: AbaFicha[];
  ativa: string;
}) {
  return (
    <nav
      aria-label="Seções da ficha"
      className="border-linha flex w-full max-w-full [scrollbar-width:none] gap-0.5 overflow-x-auto border-t px-4"
    >
      {abas.map((aba) => {
        const ehAtiva = aba.chave === ativa;
        return (
          <Link
            key={aba.chave}
            href={`/familias/${familiaId}?aba=${aba.chave}`}
            aria-current={ehAtiva ? "page" : undefined}
            className={cn(
              "min-h-toque ease-estado flex shrink-0 items-center border-b-2 px-3 py-2.5 text-[12.5px] whitespace-nowrap no-underline transition-[color,border-color] duration-140",
              ehAtiva
                ? "text-texto border-dourado font-semibold"
                : "text-tinta-50 hover:text-texto border-transparent font-medium",
            )}
          >
            {aba.rotulo}
          </Link>
        );
      })}
    </nav>
  );
}
