"use client";

import { useId } from "react";
import { Compass } from "lucide-react";
import { TileIcone } from "@/components/ui/tile-icone";
import { TEXTOS_TOUR } from "./passos";

/**
 * Convite da primeira entrada: um cartão discreto no canto, que não bloqueia
 * nada e não puxa o foco. Aparece só na tela inicial da pessoa, até ela
 * começar o tour ou tocar em "Agora não"; depois não volta (localStorage,
 * por pessoa e versão do tour). Nunca começa o tour sozinho.
 */
export function ConviteTour({
  minutos,
  aoComecar,
  aoDispensar,
}: {
  minutos: number;
  aoComecar: (origem: HTMLElement | null) => void;
  aoDispensar: () => void;
}) {
  const idTitulo = useId();
  return (
    <section
      aria-labelledby={idTitulo}
      data-tour-convite=""
      className="rounded-3 border-linha bg-superficie shadow-2 fixed inset-x-4 bottom-[calc(var(--altura-abas)+16px+env(safe-area-inset-bottom))] z-[calc(var(--z-barra)+2)] mx-auto flex max-w-[400px] flex-col gap-3 border p-4 lg:inset-x-auto lg:right-6 lg:bottom-6 lg:w-[340px] lg:p-5"
    >
      <div className="flex items-start gap-3">
        <TileIcone tom="dourado" tamanho="p">
          <Compass />
        </TileIcone>
        <div className="flex min-w-0 flex-col gap-1">
          <h2 id={idTitulo} className="text-corpo text-texto font-semibold">
            {TEXTOS_TOUR.convite.titulo(minutos)}
          </h2>
          <p className="text-apoio text-texto-2">{TEXTOS_TOUR.convite.texto}</p>
        </div>
      </div>
      <div className="flex flex-wrap items-center justify-end gap-2">
        <button
          type="button"
          onClick={aoDispensar}
          className="text-apoio text-texto-2 hover:bg-marinho-08 hover:text-texto inline-flex min-h-[44px] items-center rounded-[7px] px-3 font-medium"
        >
          {TEXTOS_TOUR.convite.agoraNao}
        </button>
        <button
          type="button"
          onClick={(evento) => aoComecar(evento.currentTarget)}
          className="text-apoio border-acao bg-acao text-acao-texto hover:bg-acao-hover inline-flex min-h-[44px] items-center rounded-[7px] border px-4 font-semibold"
        >
          {TEXTOS_TOUR.convite.comecar}
        </button>
      </div>
    </section>
  );
}
