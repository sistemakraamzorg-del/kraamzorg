import { diaDaSemanaDesdeSegunda } from "@/lib/agenda/datas";
import type { DiaEscala, LinhaEscala } from "@/lib/dados/tipos-equipe";
import type { OcupacaoSemana } from "@/lib/dados/tipos-operacao";
import { formatarData } from "@/lib/formatacao";
import { cn } from "@/lib/utils";
import { Avatar } from "./avatar";

const DIAS = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"] as const;
const PCT = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 0 });

type TomCelula = "on" | "off" | "livre" | "conf";

const CLASSE: Record<TomCelula, string> = {
  on: "bg-dourado-lavado border-dourado-2 text-dourado-texto font-semibold",
  off: "bg-cinza-lavado border-dashed border-linha text-tinta-30",
  livre: "bg-creme-2 border-linha text-tinta-50",
  conf: "bg-alerta-lavado border-alerta text-alerta-texto font-semibold",
};

/** Uma célula por dia: as duas faixas do dia resumidas numa palavra ou numa contagem. */
function resumoDoDia(d: DiaEscala): { tom: TomCelula; texto: string } {
  const visitas = d.visitas;
  if (d.manha.conflito || d.tarde.conflito || d.sobrecarga) {
    return {
      tom: "conf",
      texto: visitas === 1 ? "1 visita" : `${visitas} visitas`,
    };
  }
  if (d.folga) return { tom: "off", texto: "folga" };
  if (visitas > 0) {
    return {
      tom: "on",
      texto: visitas === 1 ? "1 visita" : `${visitas} visitas`,
    };
  }
  const estados = [d.manha.estado, d.tarde.estado];
  if (estados.includes("backup")) return { tom: "on", texto: "backup" };
  if (estados.includes("reservada")) return { tom: "on", texto: "reservada" };
  if (estados.includes("oferta")) return { tom: "on", texto: "oferta" };
  return { tom: "livre", texto: "livre" };
}

function frase(nome: string, d: DiaEscala, texto: string): string {
  const dia = formatarData(d.dia) ?? d.dia;
  const turnos = [
    `manhã ${d.manha.estado}${d.manha.conflito ? " com conflito" : ""}`,
    `tarde ${d.tarde.estado}${d.tarde.conflito ? " com conflito" : ""}`,
  ].join(", ");
  return `${nome}, ${dia}: ${texto} (${turnos})${d.sobrecarga ? ", acima do limite de visitas do dia" : ""}.`;
}

/**
 * Grade da escala (mockup `.esc`): profissionais nas linhas, os sete dias nas
 * colunas, uma célula por dia (dourado claro alocada, creme livre, tracejado
 * folga, vermelho claro conflito ou passa do limite). O estado vem sempre
 * calculado das visitas, designações e bloqueios. No celular rola para os lados.
 */
export function GradeEscala({
  linhas,
  hoje,
}: {
  linhas: LinhaEscala[];
  hoje: string;
}) {
  const dias = linhas[0]?.dias ?? [];
  return (
    <div
      role="region"
      aria-label="Escala da semana, role para os lados no celular"
      tabIndex={0}
      className="overflow-x-auto"
    >
      <div
        className="grid gap-[3px] text-[11px]"
        style={{
          minWidth: "640px",
          gridTemplateColumns: `132px repeat(${dias.length || 7}, minmax(0, 1fr))`,
        }}
      >
        <div />
        {dias.map((d) => (
          <div
            key={d.dia}
            aria-current={d.dia === hoje ? "date" : undefined}
            className={cn(
              "text-tinta-50 pb-[5px] text-center text-[9.5px] font-semibold tracking-[0.08em] uppercase",
              d.dia === hoje && "text-marinho",
            )}
          >
            {DIAS[diaDaSemanaDesdeSegunda(d.dia)]} {d.dia.slice(8, 10)}
          </div>
        ))}
        {linhas.map((l) => (
          <div key={l.profissionalId} className="contents">
            <div className="flex items-center gap-[7px] py-[5px] text-xs font-semibold">
              <Avatar nome={l.nome} className="size-[22px] text-[9px]" />
              <span className="min-w-0 truncate">{l.nome}</span>
            </div>
            {l.dias.map((d) => {
              const r = resumoDoDia(d);
              const f = frase(l.nome, d, r.texto);
              return (
                <div
                  key={d.dia}
                  title={f}
                  aria-label={f}
                  role="img"
                  data-estado={r.tom}
                  className={cn(
                    "rounded-[5px] border px-[3px] py-1.5 text-center text-[10px]",
                    CLASSE[r.tom],
                  )}
                >
                  {r.texto}
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}

const LEGENDA: { tom: TomCelula; rotulo: string }[] = [
  { tom: "on", rotulo: "Alocada, backup ou reservada" },
  { tom: "livre", rotulo: "Disponível" },
  { tom: "off", rotulo: "Folga ou bloqueio" },
  { tom: "conf", rotulo: "Conflito ou acima do limite do dia" },
];

export function LegendaGrade() {
  return (
    <ul
      aria-label="Legenda da escala"
      className="text-tinta-50 mt-3.5 flex flex-wrap gap-3.5 text-[11px]"
    >
      {LEGENDA.map((i) => (
        <li key={i.tom}>
          <span
            aria-hidden="true"
            className={cn(
              "mr-[5px] inline-block size-[9px] rounded-[2px] border align-[-1px]",
              CLASSE[i.tom],
            )}
          />
          {i.rotulo}
        </li>
      ))}
    </ul>
  );
}

/** Ocupação por praça e semana (mockup, `data-type="heat"`): uma grade de números, verde, âmbar ou vermelho claro. */
export function MapaOcupacao({ ocupacao }: { ocupacao: OcupacaoSemana[] }) {
  const semanas = [...new Set(ocupacao.map((o) => o.semana))].sort();
  const pracas = [
    ...new Map(ocupacao.map((o) => [o.regiaoId, o.regiao])).entries(),
  ].sort((a, b) => a[1].localeCompare(b[1], "pt-BR"));
  if (pracas.length === 0) {
    return (
      <p className="text-tinta-50 text-[12.5px]">
        Nenhuma praça com limite cadastrado ainda.
      </p>
    );
  }
  return (
    <div
      role="region"
      tabIndex={0}
      aria-label="Ocupação por praça e semana"
      className="overflow-x-auto"
    >
      <div
        className="grid gap-[3px] text-[11px]"
        style={{
          minWidth: `${110 + semanas.length * 52}px`,
          gridTemplateColumns: `110px repeat(${semanas.length}, minmax(0, 1fr))`,
        }}
      >
        <div />
        {semanas.map((s) => (
          <div
            key={s}
            className="text-tinta-50 pb-1 text-center font-mono text-[10px]"
          >
            {formatarData(s)?.slice(0, 5)}
          </div>
        ))}
        {pracas.map(([id, nome]) => (
          <div key={id} className="contents">
            <div className="py-1 text-xs font-semibold">{nome}</div>
            {semanas.map((s) => {
              const o = ocupacao.find(
                (x) => x.regiaoId === id && x.semana === s,
              );
              if (!o) return <div key={s} />;
              const tom =
                o.ocupacaoPct >= 100
                  ? "bg-alerta-lavado border-alerta text-alerta-texto"
                  : o.acimaDoLimite
                    ? "bg-aviso-lavado border-aviso-borda text-aviso-texto"
                    : "bg-sucesso-lavado border-sucesso-borda text-sucesso-texto";
              return (
                <div
                  key={s}
                  title={`${nome}, semana de ${formatarData(s)}: ${PCT.format(o.ocupacaoPct)}%`}
                  className={cn(
                    "rounded-[5px] border py-1.5 text-center font-mono text-[10.5px]",
                    tom,
                  )}
                >
                  {PCT.format(o.ocupacaoPct)}%
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
