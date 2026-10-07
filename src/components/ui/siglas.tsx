import * as React from "react";

/**
 * Siglas do ofício (PRD 17, glossário). Ficam na tela, porque a equipe usa
 * todo dia, mas ganham a explicação ao passar o mouse ou ao focar
 * (`<abbr title>`), para quem chegou agora não precisar adivinhar.
 */
export const SIGLAS: Record<string, string> = {
  DPP: "Data provável do parto. É uma estimativa.",
  IG: "Idade gestacional, em semanas e dias.",
  LATCH: "Escala de avaliação da mamada, de 0 a 10.",
  NTS: "Escore de trauma mamilar, de 0 a 5.",
  EVN: "Escala visual numérica de dor, de 0 a 10.",
  FBM: "Fotobiomodulação, a laserterapia.",
  ILIB: "Irradiação intravascular do sangue por laser.",
  AME: "Aleitamento materno exclusivo.",
  RN: "Recém-nascido.",
  NPS: "Nota de 0 a 10 que mede quanto as famílias recomendariam a Kraamzorg: promotores menos detratores.",
  COREN: "Conselho Regional de Enfermagem.",
};

const PADRAO = new RegExp(`\\b(${Object.keys(SIGLAS).join("|")})\\b`, "g");

/** Uma sigla com a explicação no `title`. */
export function Sigla({ children }: { children: keyof typeof SIGLAS }) {
  return (
    <abbr title={SIGLAS[children]} className="cursor-help no-underline">
      {children}
    </abbr>
  );
}

/**
 * Um texto com as siglas do ofício explicadas. Cada sigla ganha a
 * explicação só na primeira vez que aparece no texto.
 */
export function ComSiglas({ texto }: { texto: string }) {
  const partes: React.ReactNode[] = [];
  const vistas = new Set<string>();
  let ultimo = 0;
  for (const achado of texto.matchAll(PADRAO)) {
    const sigla = achado[0];
    const inicio = achado.index ?? 0;
    if (vistas.has(sigla)) continue;
    vistas.add(sigla);
    if (inicio > ultimo) partes.push(texto.slice(ultimo, inicio));
    partes.push(<Sigla key={`${sigla}-${inicio}`}>{sigla}</Sigla>);
    ultimo = inicio + sigla.length;
  }
  if (partes.length === 0) return <>{texto}</>;
  if (ultimo < texto.length) partes.push(texto.slice(ultimo));
  return <>{partes}</>;
}
