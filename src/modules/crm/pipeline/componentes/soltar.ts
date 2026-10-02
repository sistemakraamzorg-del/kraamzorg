import type { NumeroPipeline } from "@/lib/dados/tipos";
import type { EstagioP1, EstagioP2 } from "@/lib/dados/tipos";
import { destinosPermitidos } from "../estagios";

type Estagio = EstagioP1 | EstagioP2;

/** O que fazer quando um cartão é solto numa coluna. */
export type DecisaoSoltar =
  | { tipo: "nada" }
  | { tipo: "recusado" }
  | { tipo: "mover"; para: Estagio }
  | { tipo: "perda" }
  | { tipo: "saida_intercorrencia"; para: Estagio };

/**
 * Decide o que o arraste significa, com a mesma regra do menu "Mover para":
 * só vale destino de `destinosPermitidos`; "perdido" abre a folha de motivo e
 * sair de intercorrência pede motivo. Quem barra de verdade é o banco.
 */
export function decidirSoltar(
  pipeline: NumeroPipeline,
  origem: Estagio | null,
  destino: Estagio,
): DecisaoSoltar {
  if (!origem || origem === destino) return { tipo: "nada" };
  const permitido = destinosPermitidos(pipeline, origem).some(
    (d) => d.estagio === destino,
  );
  if (!permitido) return { tipo: "recusado" };
  if (destino === "perdido") return { tipo: "perda" };
  if (origem === "intercorrencia")
    return { tipo: "saida_intercorrencia", para: destino };
  return { tipo: "mover", para: destino };
}
