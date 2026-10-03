import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

/**
 * Selo de estado (DESIGN.md, seção 6). Pílula de 28 px, 13 px em 600, ícone
 * de 16 quando o estado é de risco. Sempre com texto (nunca só ícone ou só
 * cor). `sensivel` é ameixa, nunca vermelho (luto e intercorrência não são
 * erro). `destaque` (dourado com texto marinho) só para "Oferta pendente" e
 * "Quente" (DESIGN.md, seção 4: regra de um acento dourado por tela).
 */
const seloVariantes = cva(
  "inline-flex items-center gap-[5px] rounded-pilula px-2 py-[3px] text-[11px] leading-none font-semibold tracking-[0.02em] whitespace-nowrap",
  {
    variants: {
      variante: {
        neutro: "bg-cinza-lavado text-tinta-70",
        sucesso: "bg-sucesso-lavado text-sucesso-texto",
        aviso: "bg-aviso-lavado text-aviso-texto",
        alerta: "bg-alerta-lavado text-alerta-texto",
        sensivel: "bg-sensivel-lavado text-sensivel-texto",
        marinho: "bg-marinho text-texto-inverso",
        destaque: "bg-dourado-lavado text-dourado-texto",
        contorno:
          "border-[1.5px] border-dashed border-marinho-50 bg-transparent text-texto-2",
      },
    },
    defaultVariants: { variante: "neutro" },
  },
);

export interface SeloProps
  extends
    React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof seloVariantes> {
  icone?: React.ReactNode;
}

export function Selo({
  variante,
  icone,
  className,
  children,
  ...props
}: SeloProps) {
  return (
    <span className={cn(seloVariantes({ variante }), className)} {...props}>
      {icone ? (
        <span className="[&>svg]:size-3.5" aria-hidden="true">
          {icone}
        </span>
      ) : null}
      {children}
    </span>
  );
}
