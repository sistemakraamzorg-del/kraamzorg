import { describe, expect, it } from "vitest";
import { DEFINICAO_DOC2 } from "@/lib/dados/demonstracao/assistencial-fixtures";
import type { BaseEvolucao } from "@/lib/dados/tipos-evolucao";
import { celulaDoValor, montarRotina, type LinhaRotina } from "./rotina";

const BEBE = "00000000-0000-4000-8620-000000000011";

function base(parcial: Partial<BaseEvolucao> = {}): BaseEvolucao {
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

const linha = (linhas: LinhaRotina[], chave: string): LinhaRotina =>
  linhas.find((l) => l.chave === chave)!;

describe("dia a dia do atendimento", () => {
  it("uma coluna por dia contratado, com a data quando a visita existe", () => {
    const m = montarRotina(base());
    expect(m.colunas.map((c) => c.diaNumero)).toEqual([1, 2, 3, 4, 5, 6]);
    expect(m.colunas[0]!.data).toBe("21/09");
    expect(m.colunas[2]!.data).toBeNull();
  });

  it("data, entrada, saída e tempo na casa comparado ao plano", () => {
    const m = montarRotina(base());
    const data = linha(m.agenda, "data");
    expect(data.celulas[0]).toEqual({ principal: "21/09", detalhe: "Segunda" });
    const entrada = linha(m.agenda, "entrada");
    const saida = linha(m.agenda, "saida");
    const tempo = linha(m.agenda, "tempo");
    expect(entrada.celulas[0]).toEqual({ principal: "09:34" });
    expect(saida.celulas[0]).toEqual({ principal: "12:39" });
    expect(tempo.celulas[0]).toEqual({ principal: "3h05", detalhe: "de 3h" });
    expect(tempo.celulas[1]).toBeNull();
    expect(m.minutosNaCasa).toBe(185);
    expect(m.diasComHorario).toBe(1);
  });

  it("mostra a situação só quando algum dia não aconteceu como previsto", () => {
    const m = montarRotina(base());
    const situacao = linha(m.agenda, "situacao");
    expect(situacao.celulas[0]).toBeNull();
    expect(situacao.celulas[1]).toEqual({ principal: "Agendada" });
  });

  it("os campos do checklist saem com o rótulo do DOC 2 e o valor de cada dia", () => {
    const m = montarRotina(base());
    const chegada = m.grupos.find((g) => g.chave === "1")!;
    expect(chegada.titulo).toBe("1. Chegada e preparo");
    const acompanhante = chegada.linhas.find(
      (l) => l.chave === "1.acompanhante_presente",
    )!;
    expect(acompanhante.celulas[0]).toEqual({
      principal: "Sim",
      detalhe: "Parceiro",
    });
    const sinais = m.grupos.find((g) => g.chave === "2.1")!;
    expect(sinais.titulo).toBe("2.1 Sinais vitais");
    expect(sinais.linhas[0]!.rotulo).toBe("Pressão arterial (mmHg)");
    expect(sinais.linhas[0]!.celulas[0]).toEqual({ principal: "118/76" });
    expect(sinais.linhas[1]!.celulas[0]).toEqual({ principal: "36,7" });
  });

  it("bloco do bebê lê o item do bebê; resumo e hora da assinatura vêm do registro", () => {
    const m = montarRotina(base());
    const rn = m.grupos.find((g) => g.chave === "3")!;
    expect(rn.linhas[0]!.celulas[0]).toEqual({ principal: "Zona I" });
    const resumo = m.grupos.find((g) => g.chave === "resumo")!;
    expect(resumo.linhas[0]!.celulas[0]).toEqual({
      principal: "Primeira visita tranquila.",
    });
    const assinatura = m.grupos.find((g) => g.chave === "assinatura")!;
    expect(assinatura.linhas[0]!.celulas[0]).toEqual({ principal: "12:50" });
  });

  it("campo condicional vazio em todos os dias fica de fora, como no papel", () => {
    const m = montarRotina(base());
    expect(m.grupos.some((g) => g.chave === "ultimo_dia")).toBe(false);
    const comunicacao = m.grupos.find((g) => g.chave === "9")!;
    expect(comunicacao.linhas.some((l) => l.chave.startsWith("9.motivo"))).toBe(
      false,
    );
  });

  it("gêmeos: o bloco do recém-nascido repete por bebê, com o nome no título", () => {
    const segundo = "00000000-0000-4000-8620-000000000012";
    const b = base();
    const m = montarRotina({
      ...b,
      bebes: [
        { ...b.bebes[0]!, nome: "Bebê Teste Brisa 1" },
        { ...b.bebes[0]!, id: segundo, ordem: 2, nome: "Bebê Teste Brisa 2" },
      ],
    });
    const titulos = m.grupos
      .filter((g) => g.chave.startsWith("3."))
      .map((g) => g.titulo);
    expect(titulos).toContain("3. RN, avaliação, Bebê Teste Brisa 1");
    expect(titulos).toContain("3. RN, avaliação, Bebê Teste Brisa 2");
  });

  it("sem definição do DOC 2 a agenda continua de pé", () => {
    const m = montarRotina(base({ definicaoChecklist: null }));
    expect(m.grupos).toEqual([]);
    expect(m.agenda.length).toBeGreaterThan(0);
  });
});

describe("valor de um campo", () => {
  const campo = DEFINICAO_DOC2.blocos
    .flatMap((b) => b.campos)
    .find((c) => c.id === "fbm_aplicada")!;

  it("múltipla escolha vira a lista de rótulos", () => {
    expect(celulaDoValor(campo, ["analgesia", "ilib"])).toEqual({
      principal: "Analgesia, ILIB",
    });
  });

  it("ausência justificada aparece com a justificativa", () => {
    expect(
      celulaDoValor(campo, { ausente: true, justificativa: "Sem retorno" }),
    ).toEqual({ principal: "Não informado", detalhe: "Sem retorno" });
  });
});
