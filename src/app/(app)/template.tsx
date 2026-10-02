"use client";

import type { ReactNode } from "react";

/** Entrada suave a cada troca de tela (fade e subida de 8 px; ver `entrar-tela` no globals.css). */
export default function TemplateApp({ children }: { children: ReactNode }) {
  return <div className="entrar-tela">{children}</div>;
}
