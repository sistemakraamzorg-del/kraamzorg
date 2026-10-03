import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { classesChip } from "@/components/mockup";
import { cn } from "@/lib/utils";
import { somarMeses } from "@/lib/gestao/financeiro";
import { rotuloMes, mesParaBusca } from "@/lib/gestao/formato";

/**
 * As quatro telas do financeiro da Fase 3 (P46): visão do mês, despesas,
 * pagamento da equipe e conferência do extrato. Mesmo desenho dos filtros de
 * cobranças: trilha em pílula, a tela atual em branco [v4.4].
 */
const TELAS = [
  { href: "/financeiro", rotulo: "Visão do mês" },
  { href: "/financeiro/despesas", rotulo: "Despesas" },
  { href: "/financeiro/equipe", rotulo: "Pagamento da equipe" },
  { href: "/financeiro/extrato", rotulo: "Extrato do banco" },
] as const;

export function NavegacaoFinanceiro({
  atual,
  mes,
}: {
  atual: (typeof TELAS)[number]["href"];
  /** Primeiro dia do mês em vista; as telas mensais levam o mês junto. */
  mes?: string;
}) {
  return (
    // Mesmo desenho do `.subnav` do mockup: botões de 7 px de raio, o atual em marinho.
    <nav aria-label="Telas do financeiro" className="flex flex-wrap gap-1.5">
      {TELAS.map((t) => {
        const comMes = mes && t.href !== "/financeiro/extrato";
        return (
          <Link
            key={t.href}
            href={comMes ? `${t.href}?mes=${mesParaBusca(mes)}` : t.href}
            aria-current={t.href === atual ? "page" : undefined}
            className={cn(
              classesChip(t.href === atual),
              "min-h-toque ease-estado justify-center no-underline transition-colors duration-140 lg:min-h-8",
              t.href !== atual && "hover:bg-creme-2",
            )}
          >
            {t.rotulo}
          </Link>
        );
      })}
    </nav>
  );
}

/** Mês anterior, mês em vista e mês seguinte (o seguinte some no mês atual). */
export function SeletorMes({
  mes,
  hoje,
  caminho,
}: {
  mes: string;
  hoje: string;
  caminho: string;
}) {
  const anterior = somarMeses(mes, -1);
  const seguinte = somarMeses(mes, 1);
  const podeSeguir = seguinte <= `${hoje.slice(0, 7)}-01`;
  const link = (m: string) => `${caminho}?mes=${mesParaBusca(m)}`;
  return (
    <nav
      aria-label="Escolher o mês"
      className="flex flex-wrap items-center gap-1.5"
    >
      <Link
        href={link(anterior)}
        className={cn(
          classesChip(),
          "min-h-toque ease-estado hover:bg-creme-2 no-underline transition-colors duration-140 lg:min-h-8",
        )}
      >
        <ChevronLeft aria-hidden="true" className="size-4" strokeWidth={1.75} />
        {rotuloMes(anterior)}
      </Link>
      <span
        aria-current="date"
        className={cn(classesChip(true), "min-h-toque lg:min-h-8")}
      >
        {rotuloMes(mes)}
      </span>
      {podeSeguir ? (
        <Link
          href={link(seguinte)}
          className={cn(
            classesChip(),
            "min-h-toque ease-estado hover:bg-creme-2 no-underline transition-colors duration-140 lg:min-h-8",
          )}
        >
          {rotuloMes(seguinte)}
          <ChevronRight
            aria-hidden="true"
            className="size-4"
            strokeWidth={1.75}
          />
        </Link>
      ) : null}
    </nav>
  );
}
