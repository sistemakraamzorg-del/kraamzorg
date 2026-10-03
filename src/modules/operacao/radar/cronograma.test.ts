import { describe, expect, it } from "vitest";
import type { Radar, RadarFamilia } from "@/lib/dados/tipos-operacao";
import { montarCronograma, segundaDe, deDia } from "./cronograma";

const fam = (extra: Partial<RadarFamilia>): RadarFamilia =>
  ({
    familiaId: "f1",
    nome: "Família Teste",
    regiaoId: "r1",
    regiao: "Praça A",
    dpp: "2026-10-20",
    titular: null,
    backup: null,
    ...extra,
  }) as RadarFamilia;

const radar = (extra: Partial<Radar>): Radar => ({
  hoje: "2026-10-02",
  janela: { antes: 14, depois: 7 },
  limiteAlertaPct: 80,
  familias: [],
  nasceram: [],
  ocupacao: [],
  ...extra,
});

describe("cronograma", () => {
  it("começa na segunda e tem entre 8 e 12 semanas", () => {
    expect(deDia(segundaDe("2026-10-02"))).toBe("2026-09-28");
    const c = montarCronograma(radar({}));
    expect(c.semanas).toHaveLength(8);
  });

  it("barra usa a janela do radar e marca semana sem titular", () => {
    const c = montarCronograma(radar({ familias: [fam({})] }));
    const b = c.barras[0]!;
    expect(b.semTitular).toBe(true);
    expect(b.larg).toBeCloseTo((22 / 56) * 100);
    expect(c.semanas.some((s) => s.destaque === "titular")).toBe(true);
  });

  it("sobrevenda e limite destacam a coluna e entram na linha da praça", () => {
    const c = montarCronograma(
      radar({
        ocupacao: [
          {
            regiaoId: "r1",
            regiao: "Praça A",
            semana: "2026-10-12",
            ocupacaoPct: 110,
            familias: 3,
            acimaDoLimite: true,
          },
        ],
      }),
    );
    expect(c.semanas[2]!.destaque).toBe("capacidade");
    expect(c.capacidade[0]!.celulas[2]!.situacao).toBe("sobrevenda");
  });
});
