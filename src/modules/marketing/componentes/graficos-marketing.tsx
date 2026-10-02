import type {
  ContagensMarketing,
  LinhaCanalMarketing,
} from "@/lib/dados/tipos-relacao";

/**
 * Gráficos do relatório de marketing. Pizza de leads por canal com legenda
 * que quebra linha (nome nunca cortado) e percentual escrito, e funil com a
 * conversão de cada etapa. Só tokens do tema; SVG e HTML puros, como
 * `@/components/graficos`.
 */

/** Tons de série, sem vermelho: vermelho é erro, não é canal. */
const TONS = [
  "var(--marinho)",
  "var(--dourado)",
  "var(--sucesso)",
  "var(--sensivel)",
  "var(--aviso)",
] as const;
const COR_OUTROS = "var(--areia)";
const MAX_CANAIS = TONS.length;

const pct = (parte: number, todo: number): number =>
  todo > 0 ? Math.round((parte / todo) * 100) : 0;

export interface FatiaCanal {
  id: string;
  rotulo: string;
  leads: number;
  cor: string;
}

/**
 * Os cinco maiores canais e o resto junto em "Outros canais". A cor segue a
 * ordem do código do canal (e não o tamanho da fatia), para o canal manter a
 * cor quando o ranking muda de um período para outro.
 */
export function fatiasDeCanais(canais: LinhaCanalMarketing[]): FatiaCanal[] {
  const comLead = canais.filter((c) => c.leads > 0);
  const maiores = [...comLead]
    .sort((a, b) => b.leads - a.leads || a.codigo.localeCompare(b.codigo))
    .slice(0, MAX_CANAIS);
  const ids = new Set(maiores.map((c) => c.canalId));
  const resto = comLead.filter((c) => !ids.has(c.canalId));
  const fatias: FatiaCanal[] = [...maiores]
    .sort((a, b) => a.codigo.localeCompare(b.codigo))
    .map((c, i) => ({
      id: c.canalId,
      rotulo: c.nome,
      leads: c.leads,
      cor: TONS[i]!,
    }));
  const ordenadas = fatias.sort((a, b) => b.leads - a.leads);
  if (resto.length > 0) {
    ordenadas.push({
      id: "outros",
      rotulo: "Outros canais",
      leads: resto.reduce((a, c) => a + c.leads, 0),
      cor: COR_OUTROS,
    });
  }
  return ordenadas;
}

/** "3 a mais", "2 a menos" ou "igual" contra o período anterior; nulo sem dado. */
function contra(atual: number, anterior: number | undefined): string | null {
  if (anterior === undefined) return null;
  const dif = atual - anterior;
  if (dif === 0) return "igual ao período anterior";
  return `${Math.abs(dif)} ${dif > 0 ? "a mais" : "a menos"} que no período anterior`;
}

export function PizzaCanais({
  fatias,
  anteriorPorCanal,
}: {
  fatias: FatiaCanal[];
  /** Leads por canal no período anterior, quando existe. */
  anteriorPorCanal?: Map<string, number> | null;
}) {
  const soma = Math.max(
    fatias.reduce((a, f) => a + f.leads, 0),
    1,
  );
  // Pizza cheia: círculo de raio 25 com traço de 50. A folga entre fatias
  // só existe quando há mais de uma, senão a pizza única ficaria aberta.
  const r = 25;
  const c = 2 * Math.PI * r;
  const folga = fatias.length > 1 ? 1.2 : 0;
  const inicios = fatias.map((_, i) =>
    fatias.slice(0, i).reduce((a, f) => a + (f.leads / soma) * c, 0),
  );
  return (
    <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
      <svg
        viewBox="0 0 100 100"
        role="img"
        aria-label={`Leads por canal: ${fatias.map((f) => `${f.rotulo} ${f.leads}, ${pct(f.leads, soma)}%`).join("; ")}`}
        className="size-40 shrink-0 self-center"
      >
        <g transform="rotate(-90 50 50)">
          {fatias.map((f, i) => {
            const tam = (f.leads / soma) * c;
            const inicio = inicios[i]!;
            return (
              <circle
                key={f.id}
                cx="50"
                cy="50"
                r={r}
                fill="none"
                stroke={f.cor}
                strokeWidth={50}
                strokeDasharray={`${Math.max(tam - folga, 0)} ${c}`}
                strokeDashoffset={-inicio}
              >
                <title>{`${f.rotulo}: ${f.leads} (${pct(f.leads, soma)}%)`}</title>
              </circle>
            );
          })}
        </g>
      </svg>

      <ul className="flex min-w-0 flex-1 flex-col">
        {fatias.map((f) => {
          const comparacao =
            anteriorPorCanal && f.id !== "outros"
              ? contra(f.leads, anteriorPorCanal.get(f.id) ?? 0)
              : null;
          return (
            <li
              key={f.id}
              className="border-linha grid grid-cols-[auto_minmax(0,1fr)_auto] items-start gap-x-3 border-b py-2.5 first:pt-0 last:border-b-0 last:pb-0"
            >
              <span
                aria-hidden="true"
                className="rounded-1 mt-1 size-3 shrink-0"
                style={{ background: f.cor }}
              />
              <span className="text-apoio text-texto min-w-0 break-words">
                {f.rotulo}
                {comparacao ? (
                  <span className="text-mini text-texto-2 block">
                    {comparacao}
                  </span>
                ) : null}
              </span>
              <span className="text-apoio text-texto text-right font-mono whitespace-nowrap tabular-nums">
                {f.leads}
                <span className="text-texto-2 ml-2 inline-block min-w-[3ch]">
                  {pct(f.leads, soma)}%
                </span>
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

interface EtapaFunil {
  rotulo: string;
  valor: number;
  anterior?: number;
}

/**
 * Funil do lead ao contrato: uma barra por etapa, sempre na mesma escala
 * (a dos leads), e entre as etapas a conversão escrita, com a do período
 * anterior ao lado quando existe.
 */
export function FunilMarketing({
  atual,
  anterior,
}: {
  atual: ContagensMarketing;
  anterior: ContagensMarketing | null;
}) {
  const etapas: EtapaFunil[] = [
    { rotulo: "Leads", valor: atual.leads, anterior: anterior?.leads },
    {
      rotulo: "Qualificados",
      valor: atual.qualificados,
      anterior: anterior?.qualificados,
    },
    {
      rotulo: "Com contrato",
      valor: atual.ganhos,
      anterior: anterior?.ganhos,
    },
  ];
  const base = Math.max(atual.leads, 1);
  return (
    <ol
      aria-label={`Do lead ao contrato: ${etapas.map((e) => `${e.rotulo} ${e.valor}`).join(", ")}`}
      className="flex flex-col"
    >
      {etapas.map((e, i) => {
        const anteriorEtapa = etapas[i - 1];
        const conversao = anteriorEtapa
          ? pct(e.valor, anteriorEtapa.valor)
          : null;
        const conversaoAntes =
          anterior && anteriorEtapa && anteriorEtapa.anterior !== undefined
            ? pct(e.anterior ?? 0, anteriorEtapa.anterior)
            : null;
        const largura = Math.min((e.valor / base) * 100, 100);
        const delta = contra(e.valor, e.anterior);
        return (
          <li key={e.rotulo} className="flex flex-col">
            {anteriorEtapa ? (
              <p className="text-mini text-texto-2 border-linha my-2 border-l-2 pl-3">
                {anteriorEtapa.valor === 0
                  ? "Sem etapa anterior para calcular a conversão."
                  : `${conversao}% de ${anteriorEtapa.rotulo.toLowerCase()} chegaram aqui${
                      conversaoAntes !== null
                        ? `. No período anterior foram ${conversaoAntes}%.`
                        : "."
                    }`}
              </p>
            ) : null}
            <div className="flex items-baseline justify-between gap-3">
              <span className="text-apoio text-texto font-medium">
                {e.rotulo}
              </span>
              <span className="font-titulo text-numero-sm text-texto font-medium tabular-nums">
                {e.valor}
              </span>
            </div>
            <span
              aria-hidden="true"
              className="bg-areia-clara rounded-pilula mt-1 block h-3 overflow-hidden"
            >
              <span
                className="bg-marinho rounded-pilula block h-3"
                style={{ width: `${Math.max(largura, e.valor > 0 ? 2 : 0)}%` }}
              />
            </span>
            {delta ? (
              <span className="text-mini text-texto-2 mt-1">{delta}</span>
            ) : null}
          </li>
        );
      })}
    </ol>
  );
}
