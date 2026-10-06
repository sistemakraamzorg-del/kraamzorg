import { describe, expect, it } from "vitest";
import {
  formatarData,
  formatarDataHora,
  formatarDuracao,
  formatarHora,
} from "./data";

describe("formatarData", () => {
  it("formata coluna date (aaaa-mm-dd) sem deslocar fuso", () => {
    expect(formatarData("2026-09-24")).toBe("24/09/2026");
  });

  it("não perde um dia em datas no início do mês", () => {
    expect(formatarData("2026-01-01")).toBe("01/01/2026");
  });

  it("formata timestamptz UTC convertendo para America/Sao_Paulo", () => {
    // 2026-09-24T02:30:00Z é 2026-09-23 23:30 em Brasília (UTC-3): ainda dia 23.
    expect(formatarData("2026-09-24T02:30:00Z")).toBe("23/09/2026");
  });

  it("formata timestamptz que continua no mesmo dia em Brasília", () => {
    expect(formatarData("2026-09-24T15:00:00Z")).toBe("24/09/2026");
  });

  it("aceita um objeto Date", () => {
    expect(formatarData(new Date("2026-09-24T12:00:00Z"))).toBe("24/09/2026");
  });

  it("devolve null para data inválida, em vez de fixar um texto de interface", () => {
    expect(formatarData("não é uma data")).toBeNull();
  });
});

describe("formatarDataHora", () => {
  it("formata data e hora no padrão do PRD (vírgula entre data e hora)", () => {
    expect(formatarDataHora("2026-09-24T12:14:00Z")).toBe("24/09/2026, 09:14");
  });

  it("preenche hora e minuto com dois dígitos", () => {
    expect(formatarDataHora("2026-01-05T03:05:00Z")).toBe("05/01/2026, 00:05");
  });

  it("devolve null para data inválida", () => {
    expect(formatarDataHora("xyz")).toBeNull();
  });
});

describe("formatarHora", () => {
  it("mostra a hora de Brasília de um instante UTC", () => {
    expect(formatarHora("2026-09-24T12:34:00.000Z")).toBe("09:34");
  });

  it("não troca o dia: 01:05 UTC é 22:05 em Brasília", () => {
    expect(formatarHora("2026-09-24T01:05:00.000Z")).toBe("22:05");
  });

  it("devolve null para instante inválido", () => {
    expect(formatarHora("ontem")).toBeNull();
  });
});

describe("formatarDuracao", () => {
  it("horas e minutos com dois dígitos", () => {
    expect(formatarDuracao(185)).toBe("3h05");
  });

  it("hora cheia sem minutos", () => {
    expect(formatarDuracao(360)).toBe("6h");
  });

  it("menos de uma hora em minutos", () => {
    expect(formatarDuracao(45)).toBe("45min");
  });

  it("devolve null para valor negativo", () => {
    expect(formatarDuracao(-5)).toBeNull();
  });
});
