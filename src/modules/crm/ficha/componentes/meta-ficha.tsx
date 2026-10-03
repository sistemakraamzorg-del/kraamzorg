import * as React from "react";
import { LinhaGestacao } from "@/components/ui/linha-gestacao";
import { Selo } from "@/components/ui/selo";
import type { EstadoSensivel } from "@/lib/dados/tipos";
import { formatarData, localidade } from "@/lib/formatacao";
import {
  calcularIdadeGestacional,
  hojeBrasilia,
} from "@/modules/crm/pipeline/idade-gestacional";
import type { FichaTela } from "../tipos";

/**
 * Perda ou intercorrência com o freio (DESIGN.md, 11.8): bloqueio total ou
 * encerrado sensível. Nesses estados a tela da família baixa o volume:
 * sai o estágio de venda, a IG, a linha da gestação e a promessa de datas.
 */
export function emModoSensivel(estado: EstadoSensivel): boolean {
  return estado === "bloqueio_total" || estado === "encerrado_sensivel";
}

/**
 * Selos do canto do cabeçalho da família (`.tag` do mockup): estágio e IG.
 * Em modo sensível ficam só o que não promete nada, porque estágio de venda e
 * semana da gestação não cabem ao lado de uma perda (DESIGN.md, 11.8 e 11.9).
 */
export function MetaFicha({ ficha }: { ficha: FichaTela }) {
  const sensivel = emModoSensivel(ficha.estadoSensivel);
  const dpp = ficha.datas.find((d) => d.rotulo === "DPP")?.valor ?? null;
  return (
    <>
      {!sensivel && ficha.estagioRotulo ? (
        <Selo variante="neutro">{ficha.estagioRotulo}</Selo>
      ) : null}
      {!sensivel && ficha.idadeGestacional ? (
        <Selo
          variante="sucesso"
          className="font-mono"
          title={dpp ? `Calculada da DPP ${formatarData(dpp)}` : undefined}
        >
          {ficha.idadeGestacional}
        </Selo>
      ) : null}
    </>
  );
}

/** Linha pequena sob o nome: as pessoas da família e o lugar onde moram. */
export function subtituloFicha(ficha: FichaTela): string {
  const nomes = ficha.pessoas.map((p) => p.nome).join(" e ");
  return [nomes, localidade(ficha.bairro, ficha.cidade)]
    .filter(Boolean)
    .join(" · ");
}

/**
 * Linha da gestação para o cabeçalho da ficha (proposta P2-1 da camada de
 * acolhimento): só enquanto a família está gestando, sem estado sensível e
 * com a DPP registrada. A semana sai de `ig(dpp, hoje)`, nunca gravada.
 */
export function linhaDaFicha(
  ficha: FichaTela,
  hoje: string = hojeBrasilia(),
): React.ReactNode {
  if (emModoSensivel(ficha.estadoSensivel)) return null;
  const dpp = ficha.datas.find((d) => d.rotulo === "DPP")?.valor ?? null;
  const nascimento =
    ficha.datas.find((d) => d.rotulo === "Nascimento")?.valor ?? null;
  if (!dpp || nascimento) return null;
  const ig = calcularIdadeGestacional(dpp, hoje);
  const dppTexto = formatarData(dpp);
  if (!ig || ig.semanas > 42 || !dppTexto) return null;
  return (
    <LinhaGestacao
      semanas={ig.semanas}
      dias={ig.dias}
      dpp={dppTexto}
      destacarAtual
      // A IG já está na linha de meta e a DPP nas quatro datas logo abaixo:
      // a linha mostra só os blocos (a frase inteira fica no aria-label).
      semLegenda
    />
  );
}
