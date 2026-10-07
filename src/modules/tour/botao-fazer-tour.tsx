"use client";

import type { MouseEvent } from "react";
import { ChevronRight, Compass } from "lucide-react";
import { TileIcone } from "@/components/ui/tile-icone";
import { cn } from "@/lib/utils";
import { ALVO_BOTAO_TOUR } from "./montar";
import { TEXTOS_TOUR } from "./passos";
import { useTour } from "./provedor-tour";

/**
 * Botão "Fazer o tour", nos três lugares onde a pessoa procura ajuda:
 * - `lateral`: no pé da barra lateral do computador, perto do nome e do Sair;
 * - `lista`: na aba Mais do celular, no mesmo desenho dos outros itens;
 * - `bloco`: no Perfil da enfermeira, na lista "Para o seu dia a dia".
 * Fora de uma casca com o provedor do tour, não aparece.
 */
export function BotaoFazerTour({
  variante,
  className,
}: {
  variante: "lateral" | "lista" | "bloco";
  className?: string;
}) {
  const tour = useTour();
  if (!tour) return null;
  const iniciar = (evento: MouseEvent<HTMLButtonElement>) =>
    tour.iniciar(evento.currentTarget);

  if (variante === "lateral") {
    return (
      <button
        type="button"
        onClick={iniciar}
        data-tour={ALVO_BOTAO_TOUR}
        className={cn(
          "text-texto-inverso hover:bg-lateral-hover -ml-2 inline-flex min-h-8 items-center gap-2 rounded-[7px] px-2 text-[12.5px] font-medium",
          className,
        )}
      >
        <Compass
          aria-hidden="true"
          className="text-dourado-2 size-[15px]"
          strokeWidth={1.75}
        />
        {TEXTOS_TOUR.fazerTour}
      </button>
    );
  }

  if (variante === "lista") {
    return (
      <button
        type="button"
        onClick={iniciar}
        data-tour={ALVO_BOTAO_TOUR}
        className={cn(
          "rounded-3 bg-superficie shadow-1 hover:shadow-2 ease-estado min-h-toque-campo text-corpo text-texto flex w-full items-center gap-3 px-5 py-3 text-left font-semibold transition-shadow duration-140 [&>svg]:size-5",
          className,
        )}
      >
        <Compass aria-hidden="true" strokeWidth={1.75} />
        <span className="flex flex-col">
          {TEXTOS_TOUR.fazerTour}
          <span className="text-apoio text-texto-2 font-normal">
            {TEXTOS_TOUR.fazerTourApoio}
          </span>
        </span>
        <ChevronRight
          aria-hidden="true"
          className="text-texto-2 ml-auto"
          strokeWidth={1.75}
        />
      </button>
    );
  }

  return (
    <li className={className}>
      <button
        type="button"
        onClick={iniciar}
        data-tour={ALVO_BOTAO_TOUR}
        className="rounded-2 bg-superficie shadow-1 hover:bg-areia-clara ease-estado flex min-h-16 w-full items-center gap-3 px-3 py-2.5 text-left transition-[transform,background-color] duration-140 active:scale-[0.99]"
      >
        <TileIcone tom="areia" forma="quadrado" tamanho="m">
          <Compass />
        </TileIcone>
        <span className="flex min-w-0 flex-1 flex-col gap-0.5">
          <span className="text-corpo text-texto leading-snug font-semibold">
            {TEXTOS_TOUR.fazerTour}
          </span>
          <span className="text-apoio text-texto-2">
            {TEXTOS_TOUR.fazerTourApoio}
          </span>
        </span>
        <ChevronRight
          aria-hidden="true"
          className="text-texto-2 size-5 shrink-0"
          strokeWidth={1.75}
        />
      </button>
    </li>
  );
}
