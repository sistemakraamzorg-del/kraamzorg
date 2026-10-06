import { formatarData, formatarDuracao, formatarHora } from "@/lib/formatacao";
import type { Bloco, Campo } from "@/lib/instrumentos/schema";
import type {
  BaseEvolucao,
  DiaRotina,
  VisitaDaBase,
} from "@/lib/dados/tipos-evolucao";
import { ROTULO_ESTADO_VISITA } from "@/modules/operacao/comum/rotulos";

/**
 * O dia a dia do atendimento no formato da planilha de papel do DOC 2
 * (PRD 9.2: "uma coluna por dia, de D1 a D6 ou D12"): uma coluna por dia,
 * as linhas de agenda (data, horário combinado, entrada, saída e tempo na
 * casa) e, embaixo, cada campo do instrumento aprovado com o que a
 * enfermeira registrou naquele dia. Os rótulos das linhas do checklist vêm da
 * definição do DOC 2 vigente: nenhum campo clínico nasce aqui.
 *
 * Função pura: a tela só desenha o que sai daqui.
 */

export interface ColunaDia {
  diaNumero: number;
  /** "24/09"; nulo quando o dia ainda não tem visita marcada. */
  data: string | null;
}

export interface Celula {
  principal: string;
  /** Texto menor embaixo (quem acompanhou, o local da dor, o dia da semana). */
  detalhe?: string;
}

export interface LinhaRotina {
  chave: string;
  rotulo: string;
  /** Uma por coluna; nula quando não há registro naquele dia. */
  celulas: (Celula | null)[];
}

export interface GrupoRotina {
  chave: string;
  titulo: string;
  linhas: LinhaRotina[];
}

export interface ModeloRotina {
  colunas: ColunaDia[];
  agenda: LinhaRotina[];
  grupos: GrupoRotina[];
  diasComRegistro: number;
  diasPrevistos: number;
  /** Soma das durações dos dias com entrada e saída, em minutos. */
  minutosNaCasa: number;
  /** Dias com entrada e saída marcadas (os que entram na soma). */
  diasComHorario: number;
  horasPorVisita: number | null;
}

const ROTULOS_AGENDA = {
  data: "Data",
  combinado: "Horário combinado",
  entrada: "Entrada na casa",
  saida: "Saída da casa",
  tempo: "Tempo na casa",
  situacao: "Situação da visita",
} as const;

/** Estados em que a visita aconteceu e não precisa de selo na tabela. */
const ESTADOS_FEITOS = new Set(["concluida", "ficha_entregue", "encerrada"]);

const DIAS_DA_SEMANA = [
  "Domingo",
  "Segunda",
  "Terça",
  "Quarta",
  "Quinta",
  "Sexta",
  "Sábado",
];

type Objeto = Record<string, unknown>;

function ehObjeto(valor: unknown): valor is Objeto {
  return valor !== null && typeof valor === "object" && !Array.isArray(valor);
}

/** "aaaa-mm-dd" → "24/09" e o dia da semana, sem passar pelo fuso. */
function dataCurta(data: string): { curta: string; semana: string } | null {
  const achado = /^(\d{4})-(\d{2})-(\d{2})$/.exec(data);
  if (!achado) return null;
  const [, ano, mes, dia] = achado;
  const semana =
    DIAS_DA_SEMANA[
      new Date(Date.UTC(Number(ano), Number(mes) - 1, Number(dia))).getUTCDay()
    ]!;
  return { curta: `${dia}/${mes}`, semana };
}

function numeroBr(valor: number, casas?: number): string {
  return valor.toLocaleString("pt-BR", {
    minimumFractionDigits: casas ?? 0,
    maximumFractionDigits: casas ?? 2,
  });
}

function rotuloDaOpcao(
  opcoes: readonly { valor: string; rotulo: string }[] | undefined,
  valor: string,
): string {
  return opcoes?.find((o) => o.valor === valor)?.rotulo ?? valor;
}

/** Rótulo da linha: o do instrumento, com a unidade quando o campo tem. */
function rotuloDoCampo(campo: Campo): string {
  if (campo.tipo === "numero" && campo.unidade) {
    return `${campo.rotulo} (${campo.unidade})`;
  }
  return campo.rotulo;
}

/** O valor registrado de um campo do DOC 2, escrito como a enfermeira leria no papel. */
export function celulaDoValor(campo: Campo, valor: unknown): Celula | null {
  if (valor === undefined || valor === null || valor === "") return null;

  if (ehObjeto(valor) && valor.ausente === true) {
    const justificativa =
      typeof valor.justificativa === "string" ? valor.justificativa : undefined;
    return {
      principal: "Não informado",
      ...(justificativa ? { detalhe: justificativa } : {}),
    };
  }

  switch (campo.tipo) {
    case "sim_nao":
      return typeof valor === "boolean"
        ? { principal: valor ? "Sim" : "Não" }
        : null;
    case "sim_nao_texto": {
      if (typeof valor === "boolean")
        return { principal: valor ? "Sim" : "Não" };
      if (!ehObjeto(valor) || typeof valor.resposta !== "boolean") return null;
      const texto =
        typeof valor.texto === "string" && valor.texto.trim() !== ""
          ? valor.texto.trim()
          : undefined;
      return {
        principal: valor.resposta ? "Sim" : "Não",
        ...(texto ? { detalhe: texto } : {}),
      };
    }
    case "escala": {
      if (typeof valor === "number") return { principal: String(valor) };
      if (!ehObjeto(valor)) return null;
      const nota = typeof valor.valor === "number" ? String(valor.valor) : null;
      const complemento =
        typeof valor.complemento === "string"
          ? rotuloDaOpcao(campo.complemento?.opcoes, valor.complemento)
          : undefined;
      if (nota === null && !complemento) return null;
      return nota === null
        ? { principal: complemento! }
        : { principal: nota, ...(complemento ? { detalhe: complemento } : {}) };
    }
    case "opcao_unica":
      return typeof valor === "string"
        ? { principal: rotuloDaOpcao(campo.opcoes, valor) }
        : null;
    case "multipla":
      return Array.isArray(valor) && valor.length > 0
        ? {
            principal: valor
              .map((v) => rotuloDaOpcao(campo.opcoes, String(v)))
              .join(", "),
          }
        : null;
    case "numero": {
      if (typeof valor === "number") {
        return { principal: numeroBr(valor, campo.casas_decimais) };
      }
      if (ehObjeto(valor) && ehObjeto(valor.partes)) {
        const partes = (campo.partes ?? []).map((p) => {
          const n = (valor.partes as Objeto)[p.id];
          return typeof n === "number" ? numeroBr(n) : null;
        });
        if (partes.every((p) => p === null)) return null;
        return { principal: partes.map((p) => p ?? "?").join("/") };
      }
      return null;
    }
    case "data":
      return typeof valor === "string"
        ? { principal: formatarData(valor) ?? valor }
        : null;
    case "hora":
      return typeof valor === "string"
        ? { principal: valor.slice(0, 5) }
        : null;
    case "texto":
    case "texto_longo":
      return typeof valor === "string" && valor.trim() !== ""
        ? { principal: valor.trim() }
        : null;
    case "automatico":
      return null;
  }
}

/** O bloco do dia: objeto comum, ou o item do bebê quando o bloco repete por bebê. */
function blocoDoDia(
  dados: Objeto,
  bloco: Bloco,
  bebeId: string | null,
  unicoBebe: boolean,
): Objeto | undefined {
  const bruto = dados[bloco.id];
  if (Array.isArray(bruto)) {
    const itens = bruto.filter(ehObjeto);
    const doBebe = itens.find((i) => i.bebe_id === bebeId);
    if (doBebe) return doBebe;
    return unicoBebe && itens.length === 1 ? itens[0] : undefined;
  }
  return ehObjeto(bruto) ? bruto : undefined;
}

function valorDoCampo(
  visita: VisitaDaBase | undefined,
  bloco: Bloco,
  campo: Campo,
  bebeId: string | null,
  unicoBebe: boolean,
): Celula | null {
  if (!visita) return null;
  if (campo.tipo === "automatico") {
    if (campo.origem !== "assinatura" || !visita.assinadoEm) return null;
    const hora = formatarHora(visita.assinadoEm);
    return hora ? { principal: hora } : null;
  }
  const doBloco = blocoDoDia(visita.dados, bloco, bebeId, unicoBebe);
  const celula = celulaDoValor(campo, doBloco?.[campo.id]);
  if (celula) return celula;
  // O resumo descritivo mora numa coluna própria do registro, não em `dados`.
  if (campo.id === "resumo_descritivo" && visita.resumoDescritivo) {
    return { principal: visita.resumoDescritivo };
  }
  return null;
}

export function montarRotina(base: BaseEvolucao): ModeloRotina {
  const porDiaRotina = new Map<number, DiaRotina>();
  for (const dia of base.rotina) porDiaRotina.set(dia.diaNumero, dia);
  const porDiaVisita = new Map<number, VisitaDaBase>();
  for (const visita of base.visitas) porDiaVisita.set(visita.diaNumero, visita);

  const ultimoDia = Math.max(
    base.acompanhamento.diasContratados,
    ...base.rotina.map((d) => d.diaNumero),
    ...base.visitas.map((v) => v.diaNumero),
    0,
  );
  const dias = Array.from({ length: ultimoDia }, (_, i) => i + 1);

  const colunas: ColunaDia[] = dias.map((n) => {
    const data = porDiaRotina.get(n)?.data ?? porDiaVisita.get(n)?.data ?? null;
    return {
      diaNumero: n,
      data: data ? (dataCurta(data)?.curta ?? data) : null,
    };
  });

  // --- Agenda: data, combinado, entrada, saída, tempo --------------------------
  const horas = base.acompanhamento.horasPorVisita;
  let minutosNaCasa = 0;
  let diasComHorario = 0;

  const celulaData = dias.map((n): Celula | null => {
    const data = porDiaRotina.get(n)?.data ?? porDiaVisita.get(n)?.data;
    const curta = data ? dataCurta(data) : null;
    return curta ? { principal: curta.curta, detalhe: curta.semana } : null;
  });
  const celulaCombinado = dias.map((n): Celula | null => {
    const hora = porDiaRotina.get(n)?.horaPrevista;
    return hora ? { principal: hora.slice(0, 5) } : null;
  });
  const celulaHora = (instante: string | null | undefined): Celula | null => {
    if (!instante) return null;
    const hora = formatarHora(instante);
    return hora ? { principal: hora } : null;
  };
  const celulaEntrada = dias.map((n) =>
    celulaHora(porDiaRotina.get(n)?.checkinEm),
  );
  const celulaSaida = dias.map((n) =>
    celulaHora(porDiaRotina.get(n)?.checkoutEm),
  );
  const celulaTempo = dias.map((n): Celula | null => {
    const dia = porDiaRotina.get(n);
    if (!dia?.checkinEm || !dia.checkoutEm) return null;
    const minutos =
      (new Date(dia.checkoutEm).getTime() - new Date(dia.checkinEm).getTime()) /
      60_000;
    const texto = formatarDuracao(minutos);
    if (!texto) return null;
    minutosNaCasa += Math.round(minutos);
    diasComHorario += 1;
    const plano = horas ? formatarDuracao(horas * 60) : null;
    return { principal: texto, ...(plano ? { detalhe: `de ${plano}` } : {}) };
  });

  const agenda: LinhaRotina[] = [
    { chave: "data", rotulo: ROTULOS_AGENDA.data, celulas: celulaData },
    {
      chave: "combinado",
      rotulo: ROTULOS_AGENDA.combinado,
      celulas: celulaCombinado,
    },
    {
      chave: "entrada",
      rotulo: ROTULOS_AGENDA.entrada,
      celulas: celulaEntrada,
    },
    { chave: "saida", rotulo: ROTULOS_AGENDA.saida, celulas: celulaSaida },
    { chave: "tempo", rotulo: ROTULOS_AGENDA.tempo, celulas: celulaTempo },
  ];

  const situacoes = dias.map((n): Celula | null => {
    const estado = porDiaRotina.get(n)?.estado;
    if (!estado || ESTADOS_FEITOS.has(estado)) return null;
    return { principal: ROTULO_ESTADO_VISITA[estado] ?? estado };
  });
  if (situacoes.some((c) => c !== null)) {
    agenda.push({
      chave: "situacao",
      rotulo: ROTULOS_AGENDA.situacao,
      celulas: situacoes,
    });
  }

  // --- Checklist: um grupo por bloco do DOC 2, o do bebê repetido por bebê ----
  const grupos: GrupoRotina[] = [];
  const definicao = base.definicaoChecklist;
  const bebes = base.bebes;
  const unicoBebe = bebes.length <= 1;
  if (definicao) {
    for (const bloco of definicao.blocos) {
      const alvos: { bebeId: string | null; sufixo: string }[] =
        !bloco.repete_por_bebe
          ? [{ bebeId: null, sufixo: "" }]
          : bebes.length > 1
            ? bebes.map((b) => ({
                bebeId: b.id,
                sufixo: b.nome ?? `bebê ${b.ordem}`,
              }))
            : [{ bebeId: bebes[0]?.id ?? null, sufixo: "" }];
      for (const alvo of alvos) {
        const linhas: LinhaRotina[] = [];
        for (const campo of bloco.campos) {
          const celulas = dias.map((n) =>
            valorDoCampo(
              porDiaVisita.get(n),
              bloco,
              campo,
              alvo.bebeId,
              unicoBebe,
            ),
          );
          const vazio = celulas.every((c) => c === null);
          // Campo que só aparece em certas condições (motivo do contato, último
          // dia) e não foi preenchido em dia nenhum fica de fora, como no papel.
          if (vazio && (campo.aparece_se || bloco.aparece_se)) continue;
          linhas.push({
            chave: `${bloco.id}.${campo.id}${alvo.sufixo ? `.${alvo.bebeId}` : ""}`,
            rotulo: rotuloDoCampo(campo),
            celulas,
          });
        }
        if (linhas.length === 0) continue;
        grupos.push({
          chave: `${bloco.id}${alvo.sufixo ? `.${alvo.bebeId}` : ""}`,
          titulo: alvo.sufixo
            ? `${tituloDoBloco(bloco)}, ${alvo.sufixo}`
            : tituloDoBloco(bloco),
          linhas,
        });
      }
    }
  }

  return {
    colunas,
    agenda,
    grupos,
    diasComRegistro: base.visitas.length,
    diasPrevistos: base.acompanhamento.diasContratados,
    minutosNaCasa,
    diasComHorario,
    horasPorVisita: horas,
  };
}

/** "1. Chegada e preparo", "2.1 Sinais vitais"; os blocos sem número (último dia, resumo) ficam só com o título. */
function tituloDoBloco(bloco: Bloco): string {
  if (!/^\d/.test(bloco.id)) return bloco.titulo;
  return bloco.id.includes(".")
    ? `${bloco.id} ${bloco.titulo}`
    : `${bloco.id}. ${bloco.titulo}`;
}
