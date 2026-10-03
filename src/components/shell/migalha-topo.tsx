"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";
import { grupoDoCaminho } from "@/lib/navegacao";

/**
 * Sobretítulo do topo (`.crumb` do HTML da cliente): em caixa alta, 11 px.
 * Sem texto passado pela tela, mostra o grupo da barra lateral em que a
 * rota mora (só no computador, onde a barra existe).
 */
export function MigalhaTopo({ sobretitulo }: { sobretitulo?: ReactNode }) {
  const caminho = usePathname();
  const derivado = sobretitulo ? null : grupoDoCaminho(caminho ?? "");
  const texto = sobretitulo ?? derivado;
  if (!texto) return null;
  return (
    <span
      className={
        "text-mini text-tinta-50 font-semibold tracking-[0.11em] uppercase lg:text-[11px]" +
        (derivado ? " hidden lg:block" : "")
      }
    >
      {texto}
    </span>
  );
}
