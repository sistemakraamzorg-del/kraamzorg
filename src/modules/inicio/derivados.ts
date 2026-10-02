import type { VisitaAgenda } from "@/lib/dados/tipos-equipe";
import type { EstagioP2 } from "@/lib/dados/tipos";
import type { RadarFamilia } from "@/lib/dados/tipos-operacao";
import type { CapacidadeVisao } from "@/lib/dados/tipos-gestao";
import { somarDias } from "@/lib/agenda/datas";

/**
 * Contas dos gráficos do Início. Só agrupam o que as leituras já devolvem;
 * nenhum número nasce aqui.
 */

export type GrupoFamilia =
  "negociacao" | "contratada" | "espera" | "atendimento" | "outras";

export const ROTULO_GRUPO: Record<GrupoFamilia, string> = {
  negociacao: "Em negociação",
  contratada: "Contrato e preparo",
  espera: "Aguardando nascimento",
  atendimento: "Em atendimento",
  outras: "Outras situações",
};

const GRUPO_DO_ESTAGIO: Partial<Record<EstagioP2, GrupoFamilia>> = {
  proposta_enviada: "negociacao",
  em_negociacao: "negociacao",
  ganho: "contratada",
  contrato_gerado: "contratada",
  aguardando_assinatura: "contratada",
  assinado: "contratada",
  cobranca_gerada: "contratada",
  pagamento_confirmado: "contratada",
  nota_fiscal_emitida: "contratada",
  consulta_prenatal_agendada: "contratada",
  consulta_realizada: "contratada",
  enfermeira_designada: "contratada",
  aguardando_nascimento: "espera",
  bebe_nasceu: "atendimento",
  aguardando_alta: "atendimento",
  atendimento_liberado: "atendimento",
};

export function familiasPorGrupo(
  familias: Pick<RadarFamilia, "estagioP2">[],
): Record<GrupoFamilia, number> {
  const total: Record<GrupoFamilia, number> = {
    negociacao: 0,
    contratada: 0,
    espera: 0,
    atendimento: 0,
    outras: 0,
  };
  for (const f of familias) total[GRUPO_DO_ESTAGIO[f.estagioP2] ?? "outras"]++;
  return total;
}

/** Maior ocupação de cada semana entre as regiões, em ordem de data. */
export function ocupacaoPorSemana(
  visao: CapacidadeVisao,
  max = 6,
): { semana: string; ocupacaoPct: number }[] {
  const mapa = new Map<string, number>();
  for (const r of visao.regioes)
    for (const s of r.semanas)
      mapa.set(s.semana, Math.max(mapa.get(s.semana) ?? 0, s.ocupacaoPct));
  return [...mapa.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(0, max)
    .map(([semana, ocupacaoPct]) => ({ semana, ocupacaoPct }));
}

/** Visitas que contam em cada um dos 7 dias a partir da segunda. */
export function visitasPorDia(
  visitas: VisitaAgenda[],
  segunda: string,
): { dia: string; total: number }[] {
  return Array.from({ length: 7 }, (_, i) => {
    const dia = somarDias(segunda, i);
    return { dia, total: visitas.filter((v) => v.data === dia).length };
  });
}
