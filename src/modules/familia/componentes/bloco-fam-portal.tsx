import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * `.fam-portal` do mockup da cliente: cartão com degradê creme, saudação em
 * Jost leve de 24 px, uma linha de apoio e a barra `.prog` (9 px, trilho
 * branco, preenchimento dourado). Usado no portal da família e na prévia da
 * equipe, para os dois serem o mesmo desenho. Só tokens do tema.
 */
export function BlocoFamPortal({
  titulo,
  apoio,
  progresso,
  extremos,
  children,
  className,
}: {
  titulo: ReactNode;
  apoio?: ReactNode;
  progresso?: { valor: number; maximo: number; rotulo: string } | null;
  /** Início e fim, nas pontas, abaixo da barra. */
  extremos?: [ReactNode, ReactNode] | null;
  children?: ReactNode;
  className?: string;
}) {
  return (
    <header
      className={cn(
        "rounded-[14px] bg-[linear-gradient(160deg,var(--dourado-claro),var(--areia-clara))] p-5",
        className,
      )}
    >
      <h1 className="font-titulo text-marinho text-[24px] leading-tight font-light">
        {titulo}
      </h1>
      {apoio ? (
        <p className="text-dourado-texto mt-0.5 text-[11.5px]">{apoio}</p>
      ) : null}
      {progresso ? (
        <div
          role="progressbar"
          aria-label={progresso.rotulo}
          aria-valuemin={0}
          aria-valuemax={progresso.maximo}
          aria-valuenow={progresso.valor}
          className="bg-superficie/65 rounded-pilula my-[9px] h-[9px] overflow-hidden"
        >
          <i
            className="bg-dourado rounded-pilula block h-full"
            style={{
              width: `${progresso.maximo > 0 ? (100 * progresso.valor) / progresso.maximo : 0}%`,
            }}
          />
        </div>
      ) : null}
      {extremos ? (
        <div className="text-dourado-texto flex justify-between text-[11px]">
          <span>{extremos[0]}</span>
          <span>{extremos[1]}</span>
        </div>
      ) : null}
      {children}
    </header>
  );
}
