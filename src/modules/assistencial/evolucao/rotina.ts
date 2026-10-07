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

/** Como está o checklist de um dia (para a faixa "Checklist de cada dia"). */
export type SituacaoChecklistDia =
  /** Registro assinado com campos do checklist. */
  | "feito"
  /** Registro assinado, mas sem nenhum campo do DOC 2 (dado de antes do instrumento). */
  | "sem_campos"
  /** A visita já devia ter o checklist e ele não foi registrado. */
  | "falta"
  /** A visita ainda vai acontecer ou ainda nem foi marcada. */
  | "adiante"
  /** A visita não aconteceu (cancelada ou não realizada). */
  | "nao_aconteceu";

export interface DiaChecklist {
  diaNumero: number;
  /** "03/10", ou nulo quando o dia ainda não tem visita. */
  data: string | null;
  /** Visita do dia, para abrir o checklist; nulo se ainda não há visita. */
  visitaId: string | null;
  situacao: SituacaoChecklistDia;
  /** Campos do checklist com valor neste dia. */
  campos: number;
}

export interface ModeloRotina {
  colunas: ColunaDia[];
  /** Uma entrada por dia: situação do checklist e quantos campos têm valor. */
  diasChecklist: DiaChecklist[];
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

/**
 * Grupos que o sistema preenche sozinho ou que moram fora de `dados` (hora da
 * assinatura e resumo do dia): aparecem na grade quando existem, mas não contam
 * como "campo do checklist marcado" na cobertura nem na situação de cada dia.
 */
const GRUPOS_FORA_DA_CONTA = new Set(["assinatura", "resumo"]);

/** Verdadeiro para o grupo que conta como campo do checklist na cobertura. */
export function grupoContaNaCobertura(chave: string): boolean {
  return !GRUPOS_FORA_DA_CONTA.has(chave);
}

/** O que a planilha de papel tem preenchido e o que ficou em branco em todos os dias. */
export interface ResumoCampos {
  /** Só as linhas que têm valor em pelo menos um dia (grupos sem linha ficam de fora). */
  comRegistro: GrupoRotina[];
  /** Os campos que ninguém preencheu em dia nenhum, por grupo, só com o rótulo. */
  semRegistro: { chave: string; titulo: string; rotulos: string[] }[];
  totalComRegistro: number;
  totalSemRegistro: number;
}

/**
 * Separa os campos do checklist em "alguém registrou" e "ninguém registrou".
 * A tela mostra a grade só do primeiro grupo; o segundo vira uma lista de
 * texto, para a coordenação ver o que falta sem uma parede de células vazias.
 */
export function separarCampos(grupos: readonly GrupoRotina[]): ResumoCampos {
  const comRegistro: GrupoRotina[] = [];
  const semRegistro: ResumoCampos["semRegistro"] = [];
  let totalComRegistro = 0;
  let totalSemRegistro = 0;
  for (const grupo of grupos) {
    const foraDaConta = GRUPOS_FORA_DA_CONTA.has(grupo.chave);
    const preenchidas = grupo.linhas.filter((l) =>
      l.celulas.some((c) => c !== null),
    );
    const vazias = grupo.linhas.filter((l) =>
      l.celulas.every((c) => c === null),
    );
    if (preenchidas.length > 0) {
      comRegistro.push({ ...grupo, linhas: preenchidas });
      if (!foraDaConta) totalComRegistro += preenchidas.length;
    }
    if (foraDaConta) continue;
    if (vazias.length > 0) {
      semRegistro.push({
        chave: grupo.chave,
        titulo: grupo.titulo,
        rotulos: vazias.map((l) => l.rotulo),
      });
      totalSemRegistro += vazias.length;
    }
  }
  return { comRegistro, semRegistro, totalComRegistro, totalSemRegistro };
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

/** Visita que ainda vai acontecer: o checklist ainda não é devido. */
const ESTADOS_ADIANTE = new Set([
  "agendada",
  "confirmada",
  "a_caminho",
  "reagendada",
]);

/** Visita que não aconteceu: não há checklist a cobrar. */
const ESTADOS_NAO_ACONTECEU = new Set([
  "cancelada",
  "nao_realizada_familia",
  "nao_realizada_profissional",
]);

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

  const camposPorDia = dias.map((_, i) =>
    grupos
      .filter((g) => !GRUPOS_FORA_DA_CONTA.has(g.chave))
      .reduce(
        (soma, g) =>
          soma + g.linhas.filter((l) => l.celulas[i] !== null).length,
        0,
      ),
  );
  const diasChecklist: DiaChecklist[] = dias.map((n, i) => {
    const visita = porDiaRotina.get(n);
    const registro = porDiaVisita.get(n);
    const campos = camposPorDia[i] ?? 0;
    const estado = visita?.estado ?? null;
    let situacao: SituacaoChecklistDia;
    if (registro) situacao = campos > 0 ? "feito" : "sem_campos";
    else if (estado && ESTADOS_NAO_ACONTECEU.has(estado))
      situacao = "nao_aconteceu";
    else if (!estado || ESTADOS_ADIANTE.has(estado)) situacao = "adiante";
    else situacao = "falta";
    return {
      diaNumero: n,
      data: colunas[i]?.data ?? null,
      visitaId: visita?.visitaId ?? registro?.visitaId ?? null,
      situacao,
      campos,
    };
  });

  return {
    colunas,
    diasChecklist,
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
