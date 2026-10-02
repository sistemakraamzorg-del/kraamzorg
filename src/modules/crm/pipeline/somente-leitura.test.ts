import { describe, expect, it } from "vitest";
import type { CartaoAcompanhamento } from "@/lib/dados/tipos";
import type { PosVendaItem } from "@/lib/dados/tipos-ocorrencia";
import { cartaoDeAcompanhamento, cartaoDePosVenda } from "./somente-leitura";

const acomp: CartaoAcompanhamento = {
  acompanhamentoId: "a1",
  familiaId: "f1",
  nomeFamilia: "Família Teste",
  estado: "em_execucao",
  dpp: "2026-10-01",
  dataNascimento: null,
  bairro: "Pinheiros",
  cidade: "São Paulo",
  uf: "SP",
  regiaoId: null,
  estadoSensivel: "normal",
  inicioEfetivo: "2026-09-20",
  previsaoAlta: null,
  atualizadoEm: "2026-09-25T10:00:00Z",
};

const pv: PosVendaItem = {
  id: "p1",
  acompanhamentoId: "a1",
  familiaId: "f1",
  familiaNome: "Família Teste",
  estagio: "classificado",
  nps: 10,
  classificacao: "promotor",
  depoimentoAutorizado: true,
  autorizacaoImagem: null,
  pesquisaEnviadaEm: "2026-09-26T10:00:00Z",
  pesquisaRespondidaEm: "2026-09-27T10:00:00Z",
  pesquisaExpiraEm: null,
  linkAtivo: false,
  bloqueio: null,
  podeGerarLink: false,
  acaoExecutadaEm: null,
  criadoEm: "2026-09-25T10:00:00Z",
};

describe("cartões somente leitura", () => {
  it("atendimento mostra semana e rótulo; sensível esconde a semana", () => {
    const normal = cartaoDeAcompanhamento(acomp, "2026-09-30");
    expect(normal.rotuloEstagio).toBe("Em execução");
    expect(normal.idadeGestacional).not.toBeNull();
    const sensivel = cartaoDeAcompanhamento(
      { ...acomp, estadoSensivel: "bloqueio_total" },
      "2026-09-30",
    );
    expect(sensivel.idadeGestacional).toBeNull();
    expect(sensivel.emFreio).toBe(true);
  });

  it("pós-venda mostra a classificação e, com freio, esconde nota e palavra", () => {
    const normal = cartaoDePosVenda(pv);
    expect(normal.selos.map((s) => s.texto)).toContain("Promotor");
    expect(normal.linhas.some((l) => l.rotulo === "Nota da pesquisa")).toBe(
      true,
    );
    const freio = cartaoDePosVenda({ ...pv, bloqueio: "freio" });
    expect(freio.classificacao).toBeNull();
    expect(freio.selos.map((s) => s.texto)).not.toContain("Promotor");
    expect(freio.linhas.some((l) => l.rotulo === "Nota da pesquisa")).toBe(
      false,
    );
  });
});
