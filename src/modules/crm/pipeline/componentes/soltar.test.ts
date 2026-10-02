import { describe, expect, it } from "vitest";
import { decidirSoltar } from "./soltar";

describe("decidirSoltar", () => {
  it("não faz nada ao soltar na mesma coluna ou sem origem", () => {
    expect(decidirSoltar(1, "novo", "novo")).toEqual({ tipo: "nada" });
    expect(decidirSoltar(1, null, "novo")).toEqual({ tipo: "nada" });
  });

  it("move quando a transição existe", () => {
    expect(decidirSoltar(1, "novo", "em_conversa_ia")).toEqual({
      tipo: "mover",
      para: "em_conversa_ia",
    });
  });

  it("recusa transição que a máquina de estados não prevê", () => {
    expect(decidirSoltar(1, "novo", "sessao_venda_realizada")).toEqual({
      tipo: "recusado",
    });
  });

  it("abre a folha de perda em vez de mover direto", () => {
    expect(decidirSoltar(1, "em_conversa_ia", "perdido")).toEqual({
      tipo: "perda",
    });
  });
});
