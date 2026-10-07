import type { ChecklistVisita } from "@/lib/dados/tipos-assistencial";
import type { BaseEvolucao } from "@/lib/dados/tipos-evolucao";

/**
 * Monta, só com o que o checklist da visita já carrega, a base que a grade do
 * "dia a dia do atendimento" lê (`DiaADia`). Serve de reserva quando a base
 * completa da evolução não está disponível: o registro do dia, os dias
 * anteriores e a entrada e a saída da visita de hoje. Os horários dos dias
 * anteriores ficam em branco, porque o checklist não os traz.
 */
export function baseDoChecklist(c: ChecklistVisita): BaseEvolucao {
  const dias = [
    ...c.anteriores.map((a) => ({
      visitaId: a.visitaId,
      diaNumero: a.diaNumero,
      data: a.data,
      dados: a.dados,
      resumoDescritivo: a.resumoDescritivo,
      assinadoEm: null as string | null,
    })),
    ...(c.registro
      ? [
          {
            visitaId: c.visita.id,
            diaNumero: c.visita.diaNumero,
            data: c.visita.data,
            dados: c.registro.dados,
            resumoDescritivo: c.registro.resumoDescritivo as string | null,
            assinadoEm: c.registro.assinadoEm as string | null,
          },
        ]
      : []),
  ].sort((x, y) => x.diaNumero - y.diaNumero);

  return {
    acompanhamento: {
      id: c.visita.acompanhamentoId,
      familiaId: c.familia.id,
      estado: "",
      diasContratados: c.diasContratados,
      horasPorVisita: null,
      inicio: dias[0]?.data ?? null,
      fim: dias[dias.length - 1]?.data ?? null,
      concluidoEm: null,
      dataAlta: c.familia.dataAlta,
      dataNascimento: c.familia.dataNascimento,
    },
    hoje: c.visita.data,
    familiaNome: c.familia.nomeExibicao,
    paciente: null,
    filiacao: [],
    bebes: c.bebes.map((b) => ({
      id: b.id,
      ordem: b.ordem,
      nome: b.nome,
      sexo: null,
      tipoParto: null,
      dataNascimento: b.dataNascimento,
      pesoNascimentoG: b.pesoNascimentoG,
      pesoAltaG: b.pesoAltaG,
    })),
    medicos: [],
    profissional: null,
    funcoes: {},
    visitas: dias.map((d) => ({
      visitaId: d.visitaId,
      diaNumero: d.diaNumero,
      data: d.data,
      profissionalId: c.visita.profissionalId,
      dados: d.dados,
      resumoDescritivo: d.resumoDescritivo,
      assinadoEm: d.assinadoEm,
    })),
    rotina: dias.map((d) => {
      const hoje = d.visitaId === c.visita.id;
      return {
        visitaId: d.visitaId,
        diaNumero: d.diaNumero,
        data: d.data,
        horaPrevista: hoje ? c.visita.horaPrevista : null,
        checkinEm: hoje ? c.visita.checkinEm : null,
        checkoutEm: hoje ? c.visita.checkoutEm : null,
        estado: hoje ? c.visita.estado : "ficha_entregue",
      };
    }),
    definicaoChecklist: c.instrumento?.definicao ?? null,
    relatorios: [],
    textos: {},
    orientacoesRotulos: {},
  };
}
