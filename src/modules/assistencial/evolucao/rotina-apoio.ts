import { DEFINICAO_DOC2 } from "@/lib/dados/demonstracao/assistencial-fixtures";
import type { BaseEvolucao } from "@/lib/dados/tipos-evolucao";

/** Só para teste: uma base de evolução fictícia com dois dias e um bebê. */
export const BEBE = "00000000-0000-4000-8620-000000000011";

export function baseDeExemplo(
  parcial: Partial<BaseEvolucao> = {},
): BaseEvolucao {
  return {
    acompanhamento: {
      id: "a",
      familiaId: "f",
      estado: "em_execucao",
      diasContratados: 6,
      horasPorVisita: 3,
      inicio: "2026-09-21",
      fim: "2026-09-22",
      concluidoEm: null,
      dataAlta: "2026-09-19",
      dataNascimento: "2026-09-17",
    },
    hoje: "2026-09-22",
    familiaNome: "Família Teste Aurora",
    paciente: { nome: "Marina Teste Aurora", idade: 29 },
    filiacao: [],
    bebes: [
      {
        id: BEBE,
        ordem: 1,
        nome: "Bebê Teste Aurora",
        sexo: "feminino",
        tipoParto: "vaginal",
        dataNascimento: "2026-09-17",
        pesoNascimentoG: 3300,
        pesoAltaG: 3150,
      },
    ],
    medicos: [],
    profissional: null,
    funcoes: {},
    visitas: [
      {
        visitaId: "v1",
        diaNumero: 1,
        data: "2026-09-21",
        profissionalId: "p",
        dados: {
          "1": {
            data: "2026-09-21",
            horario: "09:34",
            acompanhante_presente: { resposta: true, texto: "Parceiro" },
          },
          "2.1": {
            pressao_arterial: { partes: { sistolica: 118, diastolica: 76 } },
            temperatura: 36.7,
          },
          "2.8": { latch: { valor: 9, complemento: "otimo" } },
          "3": [{ bebe_id: BEBE, cor_da_pele_icterica: "zona_i" }],
        },
        resumoDescritivo: "Primeira visita tranquila.",
        assinadoEm: "2026-09-21T15:50:00.000Z",
      },
    ],
    rotina: [
      {
        visitaId: "v1",
        diaNumero: 1,
        data: "2026-09-21",
        horaPrevista: "09:30",
        checkinEm: "2026-09-21T12:34:00.000Z",
        checkoutEm: "2026-09-21T15:39:00.000Z",
        estado: "ficha_entregue",
      },
      {
        visitaId: "v2",
        diaNumero: 2,
        data: "2026-09-22",
        horaPrevista: "09:30",
        checkinEm: null,
        checkoutEm: null,
        estado: "agendada",
      },
    ],
    definicaoChecklist: DEFINICAO_DOC2,
    relatorios: [],
    textos: {},
    orientacoesRotulos: {},
    ...parcial,
  };
}
