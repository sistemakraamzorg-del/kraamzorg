import { describe, expect, it } from "vitest";
import { serieNpsMensal } from "./nps-mensal";

const r = (c: "promotor" | "neutro" | "detrator", em: string) => ({
  classificacao: c,
  nps: c === "promotor" ? 10 : c === "neutro" ? 8 : 3,
  pesquisaRespondidaEm: em,
});

describe("serieNpsMensal", () => {
  it("calcula por mês com a regra do painel e marca mês sem amostra", () => {
    const s = serieNpsMensal(
      [
        r("promotor", "2026-09-10T15:00:00Z"),
        r("promotor", "2026-09-11T15:00:00Z"),
        r("detrator", "2026-09-12T15:00:00Z"),
        r("neutro", "2026-09-13T15:00:00Z"),
        r("promotor", "2026-08-01T01:00:00Z"), // 31/07 em Brasília
        { classificacao: null, nps: null, pesquisaRespondidaEm: null },
      ],
      "2026-09-01",
      3,
      4,
    );
    expect(s.meses.map((m) => m.mes)).toEqual([
      "2026-07-01",
      "2026-08-01",
      "2026-09-01",
    ]);
    expect(s.meses[2]).toMatchObject({ respostas: 4, nps: 25 });
    expect(s.meses[1]!.respostas).toBe(0);
    expect(s.meses[0]).toMatchObject({ respostas: 1, nps: null });
  });
});
