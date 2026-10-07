// @vitest-environment node
import { describe, expect, it, vi } from "vitest";
import doc2 from "../../../../supabase/dados/instrumentos/doc2.json";
import type { Json } from "@/lib/db/types";

vi.mock("server-only", () => ({}));

import { baseDoBanco } from "./evolucao";

/**
 * Dia a dia do atendimento na tela de evolução (migration 0047, provada no
 * pgTAP 046): o que assistencial.ler_base_evolucao devolve de novo vira os
 * tipos da tela, sem derrubar a tela quando algo falta ou vem fora de forma.
 */

const ACOMPANHAMENTO = "d4600000-0000-4000-8000-000000000101";
const FAMILIA = "c4600000-0000-4000-8000-000000000101";

function base(extra: Record<string, Json> = {}): Json {
  return {
    acompanhamento: {
      id: ACOMPANHAMENTO,
      familia_id: FAMILIA,
      estado: "em_execucao",
      dias_contratados: 3,
      horas_por_visita: 4.0,
      inicio: "2026-10-01",
      fim: "2026-10-03",
      concluido_em: null,
      data_alta: "2026-09-26",
      data_nascimento: "2026-09-24",
    },
    hoje: "2026-10-06",
    funcoes: {},
    familia_nome: "Família Teste Rotina 01",
    paciente: { nome: "Marina Teste Rotina 01", idade: 29 },
    filiacao: [],
    bebes: [],
    medicos: [],
    profissional: null,
    visitas: [
      {
        visita_id: "f4600000-0000-4000-8000-000000000101",
        dia_numero: 1,
        data: "2026-10-01",
        profissional_id: "d4600000-0000-4000-8000-000000000001",
        dados: { "2.1": { temperatura: 36.6 } },
        resumo_descritivo: "Resumo sintético do dia 1.",
        assinado_em: "2026-10-01T18:45:00+00:00",
      },
    ],
    rotina: [
      {
        visita_id: "f4600000-0000-4000-8000-000000000101",
        dia_numero: 1,
        data: "2026-10-01",
        hora_prevista: "09:30:00",
        checkin_em: "2026-10-01T12:40:00+00:00",
        checkout_em: "2026-10-01T18:50:00+00:00",
        estado: "ficha_entregue",
      },
      {
        visita_id: "f4600000-0000-4000-8000-000000000102",
        dia_numero: 2,
        data: "2026-10-02",
        hora_prevista: "14:00",
        checkin_em: "2026-10-02T17:05:00+00:00",
        checkout_em: null,
        estado: "iniciada",
      },
      {
        visita_id: "f4600000-0000-4000-8000-000000000103",
        dia_numero: 3,
        data: "2026-10-03",
        hora_prevista: null,
        checkin_em: null,
        checkout_em: null,
        estado: "agendada",
      },
    ],
    definicao_checklist: doc2 as Json,
    relatorios: [],
    textos: {},
    rotulos_orientacoes: {},
    ...extra,
  };
}

describe("base da evolução: o dia a dia do atendimento", () => {
  it("horas do plano e rotina por dia, com a hora combinada sem os segundos", () => {
    const b = baseDoBanco(base());
    expect(b.acompanhamento.horasPorVisita).toBe(4);
    expect(b.rotina).toHaveLength(3);
    expect(b.rotina.map((d) => d.diaNumero)).toEqual([1, 2, 3]);
    expect(b.rotina[0]).toEqual({
      visitaId: "f4600000-0000-4000-8000-000000000101",
      diaNumero: 1,
      data: "2026-10-01",
      horaPrevista: "09:30",
      checkinEm: "2026-10-01T12:40:00+00:00",
      checkoutEm: "2026-10-01T18:50:00+00:00",
      estado: "ficha_entregue",
    });
  });

  it("dia sem saída, sem hora combinada ou sem registro continua na lista, com nulos", () => {
    const b = baseDoBanco(base());
    expect(b.rotina[1]).toMatchObject({
      horaPrevista: "14:00",
      checkinEm: "2026-10-02T17:05:00+00:00",
      checkoutEm: null,
      estado: "iniciada",
    });
    expect(b.rotina[2]).toMatchObject({
      horaPrevista: null,
      checkinEm: null,
      checkoutEm: null,
      estado: "agendada",
    });
    // só a visita com registro está em visitas
    expect(b.visitas.map((v) => v.diaNumero)).toEqual([1]);
  });

  it("resumo descritivo e hora da assinatura vêm na visita com registro", () => {
    const b = baseDoBanco(base());
    expect(b.visitas[0]).toMatchObject({
      visitaId: "f4600000-0000-4000-8000-000000000101",
      resumoDescritivo: "Resumo sintético do dia 1.",
      assinadoEm: "2026-10-01T18:45:00+00:00",
    });
    expect(b.visitas[0]?.dados).toEqual({ "2.1": { temperatura: 36.6 } });
  });

  it("a definição do DOC 2 vigente passa pela validação do instrumento", () => {
    const b = baseDoBanco(base());
    expect(b.definicaoChecklist?.codigo).toBe("DOC2_CHECKLIST");
    expect(b.definicaoChecklist?.blocos.length).toBeGreaterThan(0);
  });

  it("sem rotina, sem definição e sem horas do plano: lista vazia e nulos, sem erro", () => {
    const b = baseDoBanco(
      base({
        rotina: [],
        definicao_checklist: null,
        visitas: [],
        acompanhamento: {
          id: ACOMPANHAMENTO,
          familia_id: FAMILIA,
          estado: "em_execucao",
          dias_contratados: 3,
          horas_por_visita: null,
        },
      }),
    );
    expect(b.rotina).toEqual([]);
    expect(b.definicaoChecklist).toBeNull();
    expect(b.acompanhamento.horasPorVisita).toBeNull();
    expect(b.visitas).toEqual([]);
  });

  it("resposta de antes da 0047 (sem as chaves novas) ainda vira uma base válida", () => {
    const antiga = base() as Record<string, Json>;
    delete antiga.rotina;
    delete antiga.definicao_checklist;
    const a = antiga.acompanhamento as Record<string, Json>;
    delete a.horas_por_visita;
    for (const v of antiga.visitas as Record<string, Json>[]) {
      delete v.resumo_descritivo;
      delete v.assinado_em;
    }
    const b = baseDoBanco(antiga);
    expect(b.rotina).toEqual([]);
    expect(b.definicaoChecklist).toBeNull();
    expect(b.acompanhamento.horasPorVisita).toBeNull();
    expect(b.visitas[0]?.resumoDescritivo).toBeNull();
    expect(b.visitas[0]?.assinadoEm).toBeNull();
  });

  it("definição inválida vira nula e não derruba a tela", () => {
    for (const invalida of [
      { codigo: "DOC2_CHECKLIST" },
      { blocos: "não é lista" },
      "texto solto",
      42,
      [],
    ] as Json[]) {
      const b = baseDoBanco(base({ definicao_checklist: invalida }));
      expect(b.definicaoChecklist).toBeNull();
      // o resto da base continua saindo
      expect(b.rotina).toHaveLength(3);
      expect(b.visitas).toHaveLength(1);
    }
  });
});
