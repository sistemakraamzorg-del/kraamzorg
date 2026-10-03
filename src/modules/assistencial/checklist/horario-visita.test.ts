import { describe, expect, it } from "vitest";
import {
  duracaoEmTexto,
  instanteEmBrasilia,
  minutosFeitos,
  resumoDoIntervalo,
} from "./horario-visita";

describe("horário da visita", () => {
  it("converte hora de Brasília em instante", () => {
    expect(instanteEmBrasilia("2026-10-02", "08:30")?.toISOString()).toBe(
      "2026-10-02T11:30:00.000Z",
    );
    expect(instanteEmBrasilia("2026-10-02", "xx")).toBeNull();
  });
  it("calcula e escreve a duração", () => {
    const m = minutosFeitos("2026-10-02T11:30:00Z", "2026-10-02T14:40:00Z");
    expect(m).toBe(190);
    expect(duracaoEmTexto(190)).toBe("3h10");
    expect(duracaoEmTexto(180)).toBe("3h");
    expect(
      minutosFeitos("2026-10-02T14:00:00Z", "2026-10-02T11:00:00Z"),
    ).toBeNull();
  });
  it("monta o resumo só com o que existe", () => {
    expect(resumoDoIntervalo(3, 190)).toBe("3 horas previstas, 3h10 feitas");
    expect(resumoDoIntervalo(null, 190)).toBe("3h10 feitas");
    expect(resumoDoIntervalo(3, null)).toBe("3 horas previstas");
    expect(resumoDoIntervalo(null, null)).toBeNull();
  });
});
