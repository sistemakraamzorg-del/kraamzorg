import type { FatiaRosca, TomGrafico } from "@/components/graficos";
import type { FatiaMock, TomMock } from "../graficos-mock";

/** Despesas por categoria: as 5 maiores e o resto junto, em tons distintos. */
const TONS_PIZZA: TomGrafico[] = [
  "marinho",
  "dourado",
  "sucesso",
  "sensivel",
  "aviso",
  "areia",
];

/** `valor` em centavos. */
export function fatiasDeDespesa(
  itens: { rotulo: string; centavos: number }[],
): FatiaRosca[] {
  const ord = itens
    .filter((i) => i.centavos > 0)
    .sort((a, b) => b.centavos - a.centavos);
  const topo = ord.slice(0, 5);
  const resto = ord.slice(5).reduce((a, i) => a + i.centavos, 0);
  const lista =
    resto > 0
      ? [...topo, { rotulo: "Demais categorias", centavos: resto }]
      : topo;
  return lista.map((i, k) => ({
    rotulo: i.rotulo,
    valor: i.centavos,
    tom: TONS_PIZZA[k]!,
  }));
}

/** Os mesmos grupos da rosca do mockup (`.chart` donut), nos tons dela. */
const TONS_ROSCA_MOCK: TomMock[] = [
  "dourado",
  "dourado2",
  "azul",
  "areia",
  "sensivel",
  "aviso",
];

export function fatiasDeDespesaMock(
  itens: { rotulo: string; centavos: number }[],
): FatiaMock[] {
  const ord = itens
    .filter((i) => i.centavos > 0)
    .sort((a, b) => b.centavos - a.centavos);
  const topo = ord.slice(0, 5);
  const resto = ord.slice(5).reduce((a, i) => a + i.centavos, 0);
  const lista =
    resto > 0
      ? [...topo, { rotulo: "Demais categorias", centavos: resto }]
      : topo;
  return lista.map((i, k) => ({
    rotulo: i.rotulo,
    valor: i.centavos,
    tom: TONS_ROSCA_MOCK[k]!,
  }));
}
