import type {
  OcupacaoSemana,
  Radar,
  RadarFamilia,
  RadarNasceu,
} from "@/lib/dados/tipos-operacao";
import { pontosDeAtencao } from "./agrupar";

/**
 * Cronograma sincronizado do radar: uma régua de semanas só, usada pelas
 * linhas de capacidade, pelas barras de janela da DPP e pelos nascimentos.
 * Funções puras. A janela (dias antes e depois da DPP) e o limite de alerta
 * vêm do radar, que os lê de `parametro`; aqui só se mede. A DPP é
 * estimativa: posiciona a barra, nunca dispara nada.
 */

const DIA = 86_400_000;
const MIN_SEMANAS = 8;
const MAX_SEMANAS = 12;

export function paraDia(iso: string): number {
  return Math.floor(Date.parse(`${iso.slice(0, 10)}T00:00:00Z`) / DIA);
}

export function deDia(dia: number): string {
  return new Date(dia * DIA).toISOString().slice(0, 10);
}

/** Segunda-feira da semana da data (as semanas da ocupação começam na segunda). */
export function segundaDe(iso: string): number {
  const d = paraDia(iso);
  const dow = new Date(d * DIA).getUTCDay(); // 0 domingo
  return d - ((dow + 6) % 7);
}

export type SituacaoSemana = "normal" | "atencao" | "sobrevenda";

export interface SemanaCronograma {
  inicio: string;
  /** Famílias esperadas na semana pela DPP. */
  esperadas: number;
  /** Famílias sem titular com a janela da DPP tocando a semana. */
  semTitular: RadarFamilia[];
  /** Regiões acima do limite de alerta na semana. */
  regioesAcima: string[];
  /** Algum cruzamento a destacar na coluna. */
  destaque: "nenhum" | "capacidade" | "titular";
}

export interface BarraFamilia {
  familia: RadarFamilia;
  /** Posições em % da régua, já recortadas. */
  esq: number;
  larg: number;
  dppPct: number | null;
  semTitular: boolean;
  /** A janela começa antes ou termina depois da régua. */
  cortadaAntes: boolean;
  cortadaDepois: boolean;
  fora: boolean;
}

export interface PinNasceu {
  nasceu: RadarNasceu;
  pct: number;
  /** Fim da faixa firme: a previsão de alta, em % da régua; null sem previsão. */
  altaPct: number | null;
  antesDaRegua: boolean;
  fora: boolean;
}

export interface CelulaCapacidade {
  semana: OcupacaoSemana;
  situacao: SituacaoSemana;
}

export interface LinhaCapacidade {
  regiaoId: string;
  regiao: string;
  celulas: (CelulaCapacidade | null)[];
}

export interface Cronograma {
  semanas: SemanaCronograma[];
  hojePct: number;
  capacidade: LinhaCapacidade[];
  barras: BarraFamilia[];
  nasceram: PinNasceu[];
}

export function situacaoDaSemana(o: OcupacaoSemana): SituacaoSemana {
  if (o.ocupacaoPct >= 100) return "sobrevenda";
  if (o.acimaDoLimite) return "atencao";
  return "normal";
}

function semTitular(f: RadarFamilia): boolean {
  return pontosDeAtencao(f).some((p) => p.chave === "sem_titular");
}

export function montarCronograma(radar: Radar): Cronograma {
  const ini = segundaDe(radar.hoje);
  const hoje = paraDia(radar.hoje);

  // Quantas semanas cabem: as que a DPP e a ocupação precisam, entre 8 e 12.
  let fim = ini + MIN_SEMANAS * 7;
  for (const f of radar.familias) {
    fim = Math.max(fim, paraDia(f.dpp) + radar.janela.depois + 1);
  }
  for (const o of radar.ocupacao) fim = Math.max(fim, paraDia(o.semana) + 7);
  const n = Math.min(
    MAX_SEMANAS,
    Math.max(MIN_SEMANAS, Math.ceil((fim - ini) / 7)),
  );
  const total = n * 7;
  const pct = (d: number) => ((d - ini) / total) * 100;

  const familiasComJanela = radar.familias.map((f) => {
    const d = paraDia(f.dpp);
    return { f, de: d - radar.janela.antes, ate: d + radar.janela.depois, d };
  });

  const semanas: SemanaCronograma[] = Array.from({ length: n }, (_, i) => {
    const s = ini + i * 7;
    const e = s + 6;
    const sem = familiasComJanela
      .filter((x) => x.de <= e && x.ate >= s && semTitular(x.f))
      .map((x) => x.f);
    const regioesAcima = radar.ocupacao
      .filter((o) => paraDia(o.semana) === s && o.acimaDoLimite)
      .map((o) => o.regiao);
    return {
      inicio: deDia(s),
      esperadas: familiasComJanela.filter((x) => x.d >= s && x.d <= e).length,
      semTitular: sem,
      regioesAcima,
      destaque:
        sem.length > 0
          ? "titular"
          : regioesAcima.length > 0
            ? "capacidade"
            : "nenhum",
    };
  });

  const porRegiao = new Map<string, LinhaCapacidade>();
  for (const o of [...radar.ocupacao].sort((a, b) =>
    a.regiao.localeCompare(b.regiao, "pt-BR"),
  )) {
    const linha = porRegiao.get(o.regiaoId) ?? {
      regiaoId: o.regiaoId,
      regiao: o.regiao,
      celulas: Array.from({ length: n }, () => null),
    };
    const i = Math.floor((paraDia(o.semana) - ini) / 7);
    if (i >= 0 && i < n) {
      linha.celulas[i] = { semana: o, situacao: situacaoDaSemana(o) };
    }
    porRegiao.set(o.regiaoId, linha);
  }

  const barras: BarraFamilia[] = familiasComJanela
    .sort((a, b) => a.d - b.d || a.f.nome.localeCompare(b.f.nome, "pt-BR"))
    .map(({ f, de, ate, d }) => {
      const esq = Math.max(0, pct(de));
      const dir = Math.min(100, pct(ate + 1));
      const fora = dir <= 0 || esq >= 100;
      return {
        familia: f,
        esq: Math.min(esq, 100),
        larg: Math.max(0, dir - Math.min(esq, 100)),
        dppPct: d >= ini && d < ini + total ? pct(d) : null,
        semTitular: semTitular(f),
        cortadaAntes: de < ini,
        cortadaDepois: ate + 1 > ini + total,
        fora,
      };
    });

  const nasceram: PinNasceu[] = [...radar.nasceram]
    .sort((a, b) => a.dataNascimento.localeCompare(b.dataNascimento))
    .map((nasc) => {
      const d = paraDia(nasc.dataNascimento);
      return {
        nasceu: nasc,
        pct: Math.min(100, Math.max(0, pct(d))),
        altaPct: nasc.previsaoAlta
          ? Math.min(100, Math.max(0, pct(paraDia(nasc.previsaoAlta) + 1)))
          : null,
        antesDaRegua: d < ini,
        fora: d >= ini + total,
      };
    });

  return {
    semanas,
    hojePct: Math.min(100, Math.max(0, pct(hoje))),
    capacidade: [...porRegiao.values()],
    barras,
    nasceram,
  };
}
