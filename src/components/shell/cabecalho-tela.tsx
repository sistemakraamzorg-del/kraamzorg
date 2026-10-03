import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { MigalhaTopo } from "./migalha-topo";

/**
 * Cabeçalho de tela (protótipo, `.cab-tela`): título único da tela em
 * Jost (t-display, 32 px no celular e 40 px no computador), preso no topo
 * com o fundo creme, sem divisória: o espaço separa (direção "Colo",
 * DESIGN.md 2.3). À direita, o que a tela precisar (indicador de
 * sincronização, ação principal no computador). As telas que abrem o dia
 * (Hoje, Início) usam `CabecalhoSaudacao`.
 *
 * `abertura` (DESIGN.md, 11.4): nas telas que abrem o dia (Hoje da
 * enfermeira, Início de cada papel), o título é o dia ("Terça, 29/09") e a
 * frase de estado vem logo abaixo, em `text-3` marinho, e não em cinza
 * pequeno. As outras telas mantêm o nome como título e a frase de apoio
 * em `texto-2`.
 *
 * O título nunca leva nome de família (DESIGN.md, microcopy 11): o nome
 * vai no cabeçalho da família, dentro da página.
 */
export function CabecalhoTela({
  titulo,
  subtitulo,
  lateral,
  abertura,
  sobretitulo,
}: {
  titulo: ReactNode;
  subtitulo?: ReactNode;
  lateral?: ReactNode;
  abertura?: boolean;
  /** Linha pequena em caixa alta acima do título (ex: "Operação"). */
  sobretitulo?: ReactNode;
}) {
  return (
    <>
      <header className="bg-fundo border-linha sticky top-0 z-[var(--z-barra)] -mx-4 flex min-h-16 flex-wrap items-center gap-x-4 gap-y-2 px-4 pt-3 pb-2 lg:-mx-[26px] lg:min-h-0 lg:gap-y-1 lg:border-b lg:py-3.5 lg:pr-[var(--reserva-topo,26px)] lg:pl-[26px]">
        <div className="flex flex-col">
          <MigalhaTopo sobretitulo={sobretitulo} />
          <h1 className="font-titulo text-display text-texto font-light lg:mt-px lg:text-[22px] lg:leading-snug lg:tracking-[-0.005em]">
            {titulo}
          </h1>
        </div>
        {lateral ? (
          <div className="ml-auto flex flex-wrap items-center gap-2">
            {lateral}
          </div>
        ) : null}
      </header>
      {subtitulo ? (
        <p
          className={cn(
            "mt-3 max-w-[60ch] lg:mt-2 lg:line-clamp-2 lg:text-[13px]",
            abertura ? "text-3 text-texto" : "text-apoio text-texto-2",
          )}
        >
          {subtitulo}
        </p>
      ) : null}
    </>
  );
}
