import { dataEmBrasilia } from "@/lib/agenda/datas";
import type { ClassificacaoNps } from "@/lib/dados/tipos-ocorrencia";
import { somarMeses } from "./financeiro";

/**
 * NPS mês a mês para o painel executivo. Mesma regra de
 * privado.painel_experiencia (0026_gestao.sql): conta só a pesquisa com nota e
 * classificação, o mês é o dia da resposta em Brasília, NPS é promotores menos
 * detratores sobre as respostas, em pontos, e só aparece com a amostra mínima
 * (parâmetro painel_executivo.nps_amostra_minima).
 */
export interface MesNps {
  /** Primeiro dia do mês. */
  mes: string;
  respostas: number;
  promotores: number;
  detratores: number;
  /** Nulo abaixo da amostra mínima. */
  nps: number | null;
}

export interface SerieNps {
  amostraMinima: number;
  meses: MesNps[];
}

interface RespostaNps {
  classificacao: ClassificacaoNps | null;
  nps: number | null;
  pesquisaRespondidaEm: string | null;
}

/** Arredonda como o `round` do Postgres: meio ponto se afasta do zero. */
function arredondar(v: number): number {
  return Math.sign(v) * Math.round(Math.abs(v));
}

/** Os `quantos` meses que terminam em `mesFinal` (primeiro dia), do mais antigo ao mais novo. */
export function serieNpsMensal(
  respostas: RespostaNps[],
  mesFinal: string,
  quantos: number,
  amostraMinima: number,
): SerieNps {
  const meses: MesNps[] = Array.from({ length: quantos }, (_, k) => ({
    mes: somarMeses(mesFinal, k - (quantos - 1)),
    respostas: 0,
    promotores: 0,
    detratores: 0,
    nps: null,
  }));
  for (const r of respostas) {
    if (r.nps === null || r.classificacao === null || !r.pesquisaRespondidaEm)
      continue;
    const dia = dataEmBrasilia(r.pesquisaRespondidaEm);
    const m = meses.find((x) => x.mes === `${dia?.slice(0, 7)}-01`);
    if (!m) continue;
    m.respostas += 1;
    if (r.classificacao === "promotor") m.promotores += 1;
    if (r.classificacao === "detrator") m.detratores += 1;
  }
  for (const m of meses) {
    if (m.respostas >= amostraMinima && m.respostas > 0)
      m.nps = arredondar((100 * (m.promotores - m.detratores)) / m.respostas);
  }
  return { amostraMinima, meses };
}
