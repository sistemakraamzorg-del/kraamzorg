import type { Papel } from "@/lib/auth/papeis";
import type {
  ConteudoSalvo,
  StatusEvolucao,
  TipoEvolucao,
} from "../tipos-evolucao";
import type { ConfigPrazo } from "../prazo-evolucao";
import {
  DEFINICAO_DOC2,
  ID_USUARIO_COORDENACAO,
  ID_USUARIO_ENFERMEIRA,
  dadosDeExemplo,
  dataBrasilia,
} from "./assistencial-fixtures";
import { TEXTOS_PADRAO_EVOLUCAO } from "./textos-padrao-evolucao";

/**
 * Dados fictícios da evolução no modo demonstração (P41). Nenhum nome ou
 * contato real: "Família Teste ...", "Bebê Teste ...", e-mails
 * `@exemplo.invalid`. Os registros de cada dia usam o mesmo gerador do
 * checklist (`dadosDeExemplo`), então a evolução se monta sobre dados com a
 * forma do DOC 2 aprovado, sem inventar campo clínico.
 */

const id = (grupo: number, n: number) =>
  `00000000-0000-4000-8${grupo.toString().padStart(3, "0")}-${n.toString().padStart(12, "0")}`;

export interface AcompanhamentoDemoEvolucao {
  id: string;
  familiaId: string;
  familiaNome: string;
  diasContratados: number;
  /** Horas por dia do plano (3, 4 ou 6). */
  horasPorVisita: number;
  dataAlta: string;
  dataNascimento: string;
  profissionalId: string;
  profissionalUsuarioId: string;
}

export interface RelatorioDemo {
  id: string;
  acompanhamentoId: string;
  tipo: TipoEvolucao;
  bebeId: string | null;
  conteudo: ConteudoSalvo;
  erros: string[];
  status: StatusEvolucao;
  versao: number;
  notaRevisao: string | null;
  profissionalId: string;
  aprovadoEm: string | null;
  aprovadoPor: string | null;
  enviadoEm: string | null;
  destinatarios: { especialidade: string; medicoId: string }[] | null;
  erroEnvio: string | null;
  pdfPath: string | null;
  criadoPor: string;
}

export interface LojaEvolucao {
  hoje: string;
  prazo: ConfigPrazo;
  acompanhamentos: AcompanhamentoDemoEvolucao[];
  pessoas: { familiaId: string; nome: string; idade: number }[];
  bebes: {
    id: string;
    familiaId: string;
    ordem: number;
    nome: string;
    sexo: "feminino" | "masculino";
    tipoParto: "vaginal" | "cesarea";
    dataNascimento: string;
    pesoNascimentoG: number;
    pesoAltaG: number;
  }[];
  medicos: {
    id: string;
    familiaId: string;
    especialidade: "obstetra" | "pediatra";
    nome: string;
    email: string | null;
    telefoneE164: string | null;
  }[];
  profissionais: {
    id: string;
    usuarioId: string;
    nome: string;
    funcao: string;
    conselho: string;
    conselhoUf: string;
    conselhoNumero: string;
  }[];
  visitas: {
    id: string;
    acompanhamentoId: string;
    diaNumero: number;
    data: string;
    horaPrevista: string;
    /** Entrada e saída da casa (check-in e check-out do portal), em UTC. */
    checkinEm: string | null;
    checkoutEm: string | null;
    estado: string;
    dados: Record<string, unknown> | null;
    resumoDescritivo: string | null;
    assinadoEm: string | null;
  }[];
  relatorios: RelatorioDemo[];
  textos: Record<string, string>;
  textosEmail: { assunto: string; corpo: string };
  emailConfig: { tratamento?: string; coordenacao?: string; contato?: string };
  funcoes: Record<string, string>;
  orientacoesRotulos: Record<string, string>;
  notificacoes: {
    papel: Papel | null;
    usuarioId: string | null;
    titulo: string;
    criadoEm: string;
  }[];
  tarefas: {
    id: string;
    acompanhamentoId: string;
    familiaId: string;
    acao: string;
    titulo: string;
    papelResponsavel: string;
  }[];
}

function rotulosDeOrientacao(): Record<string, string> {
  const saida: Record<string, string> = {};
  for (const bloco of DEFINICAO_DOC2.blocos) {
    if (bloco.id !== "4" && bloco.id !== "5") continue;
    for (const campo of bloco.campos ?? []) {
      if (campo.tipo === "sim_nao")
        saida[`${bloco.id}.${campo.id}`] = campo.rotulo;
    }
  }
  return saida;
}

interface CasoDemo {
  n: number;
  familia: string;
  gemelar: boolean;
  /** Dias antes de hoje em que o último dia do acompanhamento aconteceu. */
  concluidoHa: number;
  comContatos: boolean;
  /** Lesão mamilar, laser e ILIB nos dias do meio (dá o que preencher na evolução). */
  comLesao: boolean;
  /** Plano: 6 ou 12 dias, 3 ou 6 horas por dia. */
  dias: number;
  horas: number;
  /** Registros sem nenhum campo do DOC 2 (o que um dado de teste antigo deixava): a evolução nasce vazia. */
  semChecklist?: boolean;
  /** Blocos do checklist que ninguém marcou em dia nenhum (cobertura parcial). */
  blocosEmBranco?: string[];
}

/** Variação de poucos minutos na chegada e na saída, para a tabela não parecer carimbada. */
const ATRASO_CHEGADA = [4, -3, 0, 7, 2, -1, 5, 0, -2, 3, 1, 6];
const ALEM_DA_HORA = [5, 12, -4, 0, 18, 7, 3, 10, -2, 6, 0, 15];

/** "09:30" mais `minutos`, em "HH:MM". */
function somarMinutos(hora: string, minutos: number): string {
  const [h, m] = hora.split(":").map(Number) as [number, number];
  const total = h * 60 + m + minutos;
  return `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
}

/** Hora de Brasília (UTC-3, sem horário de verão) no dia `data`, como instante UTC. */
function instanteBrasilia(data: string, hora: string): string {
  const [h, m] = hora.split(":").map(Number) as [number, number];
  const base = new Date(`${data}T00:00:00.000Z`).getTime();
  return new Date(base + ((h + 3) * 60 + m) * 60_000).toISOString();
}

function registroDoDia(
  dia: number,
  data: string,
  horario: string,
  bebeIds: string[],
  caso: CasoDemo,
  cesarea: boolean,
): Record<string, unknown> {
  const evn = [6, 5, 3, 1, 0, 0][dia - 1] ?? 0;
  const pesoBase =
    [3120, 3150, 3190, 3230, 3270, 3310][dia - 1] ?? 3310 + (dia - 6) * 35;
  const dados = dadosDeExemplo(
    {
      data,
      temperatura: 36.4 + (dia % 3) * 0.2,
      pesoBebe: pesoBase,
      sistolica: 108 + dia * 2,
      diastolica: 70 + dia,
      frequenciaCardiaca: 72 + dia,
      temperaturaBebe: 36.6 + (dia % 2) * 0.2,
      medicacoes: dia <= 3 ? "Paracetamol 750 mg, se dor" : undefined,
      quemApoia: dia % 2 === 0 ? "Parceiro" : "Parceiro e avó materna",
    },
    bebeIds,
  );
  // Todos os campos do DOC 2 aprovado, como a planilha de papel: a tabela
  // do dia a dia mostra cada linha preenchida, sem campo inventado.
  const porBebe = (extra: Record<string, unknown>) =>
    bebeIds.map((bebeId) => ({ bebe_id: bebeId, ...extra }));
  dados["1"] = {
    data,
    horario,
    acompanhante_presente: {
      resposta: true,
      texto: dia % 2 === 0 ? "Avó materna" : "Parceiro",
    },
    pontualidade_confirmada: true,
    higienizacao_das_maos: true,
    apresentacao_acolhimento_familia: true,
    ...(dia > 1 ? { relato_desde_ultima_visita: true } : {}),
  };
  dados["2"] = {
    bem_estar_geral_preservado: true,
    queixa_de_dor:
      dia <= 2
        ? { resposta: true, texto: cesarea ? "Incisão" : "Períneo" }
        : { resposta: false },
    dor_intensidade: [4, 3, 2, 1][dia - 1] ?? 0,
    sangramento_loquios_esperado: true,
  };
  dados["2.4"] = {
    higiene_intima_orientada: true,
    sono_repouso_adequados: dia !== 2,
    alimentacao_hidratacao_adequadas: true,
    eliminacoes_evacuacao_presentes: dia > 1,
  };
  const latch = [7, 8, 9, 9, 10, 10][dia - 1] ?? 10;
  dados["2.8"] = {
    latch: { valor: latch, complemento: latch <= 7 ? "regular" : "otimo" },
    teste_da_linguinha: "normal",
  };
  dados["2.13"] = {
    sente_se_apoiada: [7, 8, 8, 9, 9][dia - 1] ?? 10,
    quem_mais_apoia: dia % 2 === 0 ? "Parceiro" : "Parceiro e avó materna",
  };
  dados["3"] = porBebe({
    cor_da_pele_icterica: dia <= 2 ? "zona_i" : "ausente",
    respiracao_sem_sinais_esforco: true,
    choro_habitual: true,
    atividade_responsividade_preservadas: true,
  });
  dados["2.6"] = {
    dor_mamilos_amamentar: evn > 0,
    evn,
    intervencoes_para_dor: "Compressa morna e pega corrigida",
  };
  if (cesarea) {
    dados["2.2"] = {
      cesarea_sem_sinais_infeccao: true,
      episiotomia_laceracao_sem_alteracoes: true,
      orientacoes_cuidado_reforcadas: true,
    };
  }
  if (caso.comLesao && dia >= 2 && dia <= 4) {
    dados["2.7"] = {
      lesao_mamilar: "esquerda",
      nts: 3,
      interrupcao_adequada_succao: true,
    };
  }
  if (caso.comLesao && (dia === 2 || dia === 3)) {
    dados["2.9"] = {
      fbm_aplicada: dia === 2 ? ["analgesia", "ilib"] : ["reparacao"],
    };
  }
  dados["3.2"] = bebeIds.map((bebeId) => ({
    bebe_id: bebeId,
    troca_fraldas_avaliacao_diurese: {
      resposta: true,
      texto: "Diurese presente",
    },
    banho_orientado_realizado: dia % 3 === 1,
    coto_umbilical_avaliado: {
      resposta: true,
      texto:
        dia >= 5 ? "em mumificação, seco" : "úmido, sem sinais flogísticos",
    },
    vestimenta_adequada_clima: true,
  }));
  dados["4"] = {
    massagem_extracao_leite: true,
    correcao_pega_posicao: dia <= 3,
    livre_demanda_reforcada: true,
    colica_disquesia: dia >= 3,
    posturas_de_conforto: dia >= 2,
    sinais_de_fome: dia === 1,
    manobra_de_desengasgo: dia === 2,
  };
  dados["5"] = {
    sono_seguro_orientado: dia === 1,
    sinais_janelas_sono_explicados: dia === 2,
    organizacao_rotina_familiar: dia >= 3,
  };
  dados["6"] = {
    orientacoes_ao_parceiro: dia <= 2,
    duvidas_esclarecidas: true,
  };
  dados["7"] = {
    escuta_ativa_emocoes_validadas: true,
    sinais_sofrimento_emocional: { resposta: false },
  };
  dados["8"] = {
    ambiente_organizado: true,
    alinhamento_dia_seguinte: dia < caso.dias,
  };
  dados["9"] = { contato_medico_necessario: false };
  return dados;
}

/** Tira do registro os blocos que o caso deixa em branco. */
function semBlocos(
  dados: Record<string, unknown>,
  blocos: string[] = [],
): Record<string, unknown> {
  const copia = { ...dados };
  for (const bloco of blocos) delete copia[bloco];
  return copia;
}

export function criarLojaEvolucao(): LojaEvolucao {
  const hoje = dataBrasilia(0);
  const casos: CasoDemo[] = [
    {
      n: 1,
      familia: "Família Teste Aurora",
      gemelar: false,
      concluidoHa: 0,
      comContatos: true,
      comLesao: true,
      dias: 6,
      horas: 3,
    },
    {
      n: 2,
      familia: "Família Teste Brisa",
      gemelar: true,
      concluidoHa: 0,
      comContatos: true,
      comLesao: false,
      dias: 6,
      horas: 6,
    },
    {
      n: 3,
      familia: "Família Teste Cedro",
      gemelar: false,
      concluidoHa: 0,
      comContatos: false,
      comLesao: false,
      dias: 6,
      horas: 3,
    },
    {
      n: 4,
      familia: "Família Teste Estrela",
      gemelar: false,
      concluidoHa: 12,
      comContatos: true,
      comLesao: false,
      dias: 12,
      horas: 6,
    },
    {
      n: 5,
      familia: "Família Teste Violeta",
      gemelar: false,
      concluidoHa: 0,
      comContatos: true,
      comLesao: false,
      dias: 6,
      horas: 3,
      semChecklist: true,
    },
    {
      n: 6,
      familia: "Família Teste Jasmim",
      gemelar: false,
      concluidoHa: 0,
      comContatos: true,
      comLesao: true,
      dias: 6,
      horas: 3,
      blocosEmBranco: ["2.9", "2.10", "2.11", "2.12", "6", "7"],
    },
  ];
  const profissional = {
    id: id(500, 1),
    usuarioId: ID_USUARIO_ENFERMEIRA,
    nome: "Enfermeira Teste Lima",
    funcao: "enfermeira_obstetrica",
    conselho: "COREN",
    conselhoUf: "SP",
    conselhoNumero: "TESTE-SP-0001",
  };
  const loja: LojaEvolucao = {
    hoje,
    prazo: { alertaDias: 1, escalaCoordenacaoDias: 2, feriados: [] },
    acompanhamentos: [],
    pessoas: [],
    bebes: [],
    medicos: [],
    profissionais: [profissional],
    visitas: [],
    relatorios: [],
    textos: { ...TEXTOS_PADRAO_EVOLUCAO },
    textosEmail: {
      assunto: "Evolução de enfermagem · Kraamzorg Brasil",
      corpo:
        "Olá, {tratamento} {medico}. Segue em anexo a evolução de enfermagem do acompanhamento domiciliar de {paciente}, realizado de {inicio} a {fim}, aprovada pela coordenação de enfermagem da Kraamzorg Brasil. Em caso de dúvida, fale com {coordenacao} pelo {contato}.",
    },
    emailConfig: {
      tratamento: "Dr(a).",
      coordenacao: "a coordenação de enfermagem",
      contato: "e-mail coordenacao@exemplo.invalid",
    },
    funcoes: {
      enfermeira_obstetrica: "Enfermeira obstetra",
      enfermeira_neonatal: "Enfermeira neonatal",
      coordenacao: "Coordenação de enfermagem",
    },
    orientacoesRotulos: rotulosDeOrientacao(),
    notificacoes: [],
    tarefas: [],
  };

  for (const caso of casos) {
    const familiaId = id(600, caso.n);
    const acompanhamentoId = id(610, caso.n);
    const dias = caso.dias;
    const dataAlta = dataBrasilia(-caso.concluidoHa - dias - 2);
    const dataNascimento = dataBrasilia(-caso.concluidoHa - dias - 4);
    loja.acompanhamentos.push({
      id: acompanhamentoId,
      familiaId,
      familiaNome: caso.familia,
      diasContratados: dias,
      horasPorVisita: caso.horas,
      dataAlta,
      dataNascimento,
      profissionalId: profissional.id,
      profissionalUsuarioId: ID_USUARIO_ENFERMEIRA,
    });
    const sobrenome = caso.familia.replace("Família Teste ", "");
    loja.pessoas.push(
      { familiaId, nome: `Marina Teste ${sobrenome}`, idade: 29 },
      { familiaId, nome: `Rafael Teste ${sobrenome}`, idade: 31 },
    );
    const bebeIds: string[] = [];
    const quantos = caso.gemelar ? 2 : 1;
    for (let i = 1; i <= quantos; i += 1) {
      const bebeId = id(620, caso.n * 10 + i);
      bebeIds.push(bebeId);
      loja.bebes.push({
        id: bebeId,
        familiaId,
        ordem: i,
        nome: `Bebê Teste ${sobrenome}${caso.gemelar ? ` ${i}` : ""}`,
        sexo: i === 1 ? "feminino" : "masculino",
        tipoParto: caso.n === 1 ? "cesarea" : "vaginal",
        dataNascimento,
        pesoNascimentoG: 3300 - (i - 1) * 300,
        pesoAltaG: 3150 - (i - 1) * 300,
      });
    }
    if (caso.comContatos) {
      loja.medicos.push(
        {
          id: id(630, caso.n * 10 + 1),
          familiaId,
          especialidade: "obstetra",
          nome: `Dra. Helena Teste Obstetra ${sobrenome}`,
          email: `helena.${sobrenome.toLowerCase()}@exemplo.invalid`,
          telefoneE164: null,
        },
        {
          id: id(630, caso.n * 10 + 2),
          familiaId,
          especialidade: "pediatra",
          nome: `Dr. Rodrigo Teste Pediatra ${sobrenome}`,
          email: `rodrigo.${sobrenome.toLowerCase()}@exemplo.invalid`,
          telefoneE164: null,
        },
      );
    }
    const horaPrevista = caso.horas >= 6 ? "08:00" : "09:30";
    for (let dia = 1; dia <= dias; dia += 1) {
      const data = dataBrasilia(-caso.concluidoHa - (dias - dia));
      const chegada = somarMinutos(horaPrevista, ATRASO_CHEGADA[dia - 1] ?? 0);
      const saida = somarMinutos(
        chegada,
        caso.horas * 60 + (ALEM_DA_HORA[dia - 1] ?? 0),
      );
      loja.visitas.push({
        id: id(640, caso.n * 100 + dia),
        acompanhamentoId,
        diaNumero: dia,
        data,
        horaPrevista,
        checkinEm: instanteBrasilia(data, chegada),
        checkoutEm: instanteBrasilia(data, saida),
        estado: "ficha_entregue",
        dados: caso.semChecklist
          ? {}
          : semBlocos(
              registroDoDia(dia, data, chegada, bebeIds, caso, caso.n === 1),
              caso.blocosEmBranco,
            ),
        resumoDescritivo: caso.semChecklist
          ? null
          : dia === dias
            ? "Último dia: família segura na rotina, orientações de alta revisadas."
            : `Dia ${dia}: família bem, rotina combinada para o próximo encontro.`,
        assinadoEm: instanteBrasilia(data, somarMinutos(saida, 10)),
      });
    }
  }
  void ID_USUARIO_COORDENACAO;
  return loja;
}
