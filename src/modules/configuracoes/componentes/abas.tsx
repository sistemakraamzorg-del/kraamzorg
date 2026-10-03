import Link from "next/link";
import { cn } from "@/lib/utils";

/**
 * Abas de conteúdo da tela de Configurações (DESIGN.md, 2.9 [v4.4]): trilha
 * areia em pílula, a ativa em pílula branca, rolam de lado no celular. Links
 * simples (`?aba=`), sem JavaScript: a tela funciona mesmo antes do
 * cliente carregar, e a aba fica compartilhável por link.
 */
export interface AbaConfiguracoes {
  chave: string;
  rotulo: string;
}

export function AbasConfiguracoes({
  abas,
  ativa,
}: {
  abas: AbaConfiguracoes[];
  ativa: string;
}) {
  return (
    <nav
      aria-label="Seções de configurações"
      className="flex max-w-full [scrollbar-width:none] flex-wrap gap-1.5"
    >
      {abas.map((aba) => {
        const ehAtiva = aba.chave === ativa;
        return (
          <Link
            key={aba.chave}
            href={`/configuracoes?aba=${aba.chave}`}
            aria-current={ehAtiva ? "page" : undefined}
            className={cn(
              "min-h-toque inline-flex shrink-0 items-center rounded-[7px] border px-3 text-[12.5px] whitespace-nowrap no-underline lg:min-h-8",
              ehAtiva
                ? "border-marinho bg-marinho text-texto-inverso font-medium"
                : "border-fio-2 bg-superficie text-tinta-70 hover:bg-creme-3",
            )}
          >
            {aba.rotulo}
          </Link>
        );
      })}
    </nav>
  );
}
