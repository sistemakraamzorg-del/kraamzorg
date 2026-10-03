import Link from "next/link";
import { MapPin, TriangleAlert, UserRound } from "lucide-react";
import { Card, CardHead, Nota } from "@/components/mockup";
import { Botao } from "@/components/ui/botao";
import { Selo } from "@/components/ui/selo";
import {
  dataEmBrasilia,
  diaDaSemanaDesdeSegunda,
  horaEmBrasilia,
} from "@/lib/agenda/datas";
import type { EstadoVisita, VisitaAgenda } from "@/lib/dados/tipos-equipe";
import type { SessaoVenda } from "@/lib/dados/tipos-venda";
import { formatarDiaSemanaEData } from "@/lib/formatacao";
import { cn } from "@/lib/utils";
import { fraseConflito, ROTULO_ESTADO_VISITA, ROTULO_TURNO } from "../textos";

interface Compromisso {
  ordem: string;
  chave: string;
  visita?: VisitaAgenda;
  sessao?: SessaoVenda;
}

function agruparPorDia(
  visitas: VisitaAgenda[],
  sessoes: SessaoVenda[],
): { dia: string; itens: Compromisso[] }[] {
  const porDia = new Map<string, Compromisso[]>();
  const empurra = (dia: string, item: Compromisso) => {
    const lista = porDia.get(dia) ?? [];
    lista.push(item);
    porDia.set(dia, lista);
  };
  for (const v of visitas) {
    empurra(v.data, {
      ordem: `${v.horaPrevista ?? "99:99"}-${v.profissionalNome}`,
      chave: v.visitaId,
      visita: v,
    });
  }
  for (const s of sessoes) {
    if (!s.agendadaPara) continue;
    const dia = dataEmBrasilia(s.agendadaPara);
    if (!dia) continue;
    empurra(dia, {
      ordem: `${horaEmBrasilia(s.agendadaPara) ?? "99:99"}-conversa`,
      chave: `sessao-${s.id}`,
      sessao: s,
    });
  }
  return [...porDia.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([dia, itens]) => ({
      dia,
      itens: itens.sort((a, b) => a.ordem.localeCompare(b.ordem)),
    }));
}

const DIAS_CURTOS = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"] as const;

const ESTADOS_CONCLUIDOS: EstadoVisita[] = [
  "concluida",
  "ficha_entregue",
  "encerrada",
];

type Tom = "ok" | "conf" | "normal";

interface Evento {
  chave: string;
  titulo: string;
  apoio: string;
  tom: Tom;
}

const CLASSE_EVENTO: Record<Tom, string> = {
  ok: "bg-sucesso-lavado border-sucesso",
  conf: "bg-alerta-lavado border-alerta",
  normal: "bg-dourado-lavado border-dourado",
};

/**
 * Calendário da semana (mockup `v-agenda`, `.cal`): horas nas linhas, dias
 * nas colunas, cada visita como evento com a borda na cor do estado (verde
 * concluída, vermelho conflito ou ficha pendente, dourado o resto). Mostra
 * segunda a sexta; se houver visita no fim de semana, mostra os sete dias.
 * No celular rola para os lados. Os detalhes e o "Reagendar" ficam na lista
 * por dia logo abaixo, que traz o mesmo conteúdo em texto.
 */
export function GradeSemana({
  dias,
  visitas,
  sessoes,
  hoje,
}: {
  dias: string[];
  visitas: VisitaAgenda[];
  sessoes: SessaoVenda[];
  hoje: string;
}) {
  const comFimDeSemana = visitas.some(
    (v) => diaDaSemanaDesdeSegunda(v.data) >= 5,
  );
  const colunas =
    dias.length === 1
      ? dias
      : dias.filter((d) => comFimDeSemana || diaDaSemanaDesdeSegunda(d) < 5);
  const porHora = new Map<string, Map<string, Evento[]>>();
  const poe = (hora: string, dia: string, e: Evento) => {
    const linha = porHora.get(hora) ?? new Map<string, Evento[]>();
    linha.set(dia, [...(linha.get(dia) ?? []), e]);
    porHora.set(hora, linha);
  };
  for (const v of visitas) {
    if (!colunas.includes(v.data)) continue;
    const tom: Tom =
      v.conflitos.length > 0 || v.estado === "ficha_pendente"
        ? "conf"
        : ESTADOS_CONCLUIDOS.includes(v.estado)
          ? "ok"
          : "normal";
    const nota =
      v.conflitos.length > 0
        ? "Conflito"
        : v.estado === "ficha_pendente"
          ? "Ficha pendente"
          : null;
    poe(v.horaPrevista ?? "", v.data, {
      chave: v.visitaId,
      titulo: `${v.nomeExibicao} · D${v.diaNumero}`,
      apoio: [v.profissionalNome, nota].filter(Boolean).join(" · "),
      tom,
    });
  }
  for (const s of sessoes) {
    if (!s.agendadaPara) continue;
    const dia = dataEmBrasilia(s.agendadaPara);
    if (!dia || !colunas.includes(dia)) continue;
    poe(horaEmBrasilia(s.agendadaPara) ?? "", dia, {
      chave: `sessao-${s.id}`,
      titulo: `Conversa · ${s.nomeFamilia}`,
      apoio: s.conduzidaPorNome ?? "Sem quem conduza definido",
      tom: "normal",
    });
  }
  const horas = [...porHora.keys()].sort((a, b) =>
    a === "" ? 1 : b === "" ? -1 : a.localeCompare(b),
  );
  return (
    <div
      role="region"
      aria-label="Calendário do período, role para os lados no celular"
      tabIndex={0}
      className="rounded-3 border-linha bg-superficie overflow-x-auto border"
    >
      <div
        className="grid"
        style={{
          minWidth: `${56 + colunas.length * 104}px`,
          gridTemplateColumns: `56px repeat(${colunas.length}, minmax(0, 1fr))`,
        }}
      >
        <div className="bg-creme-2 border-linha border-b" />
        {colunas.map((d) => (
          <div
            key={d}
            aria-current={d === hoje ? "date" : undefined}
            className={cn(
              "bg-creme-2 border-linha border-b px-2 py-[9px] text-center text-[11px] font-semibold",
              d === hoje && "text-marinho border-b-dourado border-b-2",
            )}
          >
            {DIAS_CURTOS[diaDaSemanaDesdeSegunda(d)]} {d.slice(8, 10)}
          </div>
        ))}
        {horas.length === 0 ? (
          <p
            className="text-tinta-50 px-4 py-6 text-[12.5px]"
            style={{ gridColumn: "1 / -1" }}
          >
            Nenhuma visita neste período.
          </p>
        ) : null}
        {horas.map((h) => (
          <div key={h} className="contents">
            <div className="text-tinta-50 border-linha border-fio-3 border-r border-b p-2 text-right font-mono text-[10px]">
              {h || "sem hora"}
            </div>
            {colunas.map((d) => (
              <div
                key={d}
                className="border-fio-3 min-h-[52px] border-r border-b p-1"
              >
                {(porHora.get(h)?.get(d) ?? []).map((e) => (
                  <div
                    key={e.chave}
                    className={cn(
                      "mb-[3px] rounded-[5px] border-l-[3px] px-[7px] py-[5px] text-[11px]",
                      CLASSE_EVENTO[e.tom],
                    )}
                  >
                    <b className="block text-[11.5px]">{e.titulo}</b>
                    {e.apoio}
                  </div>
                ))}
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * Visitas por dia (mockup `.list-i`): cada dia é um cartão com as visitas de
 * todas as enfermeiras (ou de uma) e as conversas de orientação marcadas. A
 * hora fica na coluna da esquerda; os conflitos de cada visita aparecem antes
 * de qualquer ação, e só a visita que ainda não começou leva o "Reagendar".
 */
export function ListaAgenda({
  visitas,
  sessoes,
  hoje,
  limiteVisitasDia,
}: {
  visitas: VisitaAgenda[];
  sessoes: SessaoVenda[];
  hoje: string;
  limiteVisitasDia: number;
}) {
  const dias = agruparPorDia(visitas, sessoes);
  return (
    <div
      className={cn(
        "grid grid-cols-1 items-start gap-3.5",
        dias.length > 1 && "xl:grid-cols-2",
      )}
    >
      {dias.map(({ dia, itens }) => {
        const doDia = itens.filter((i) => i.visita).length;
        const ehHoje = dia === hoje;
        return (
          <Card
            key={dia}
            id={`dia-${dia}`}
            className={cn("scroll-mt-24", ehHoje && "border-dourado")}
          >
            <CardHead
              titulo={formatarDiaSemanaEData(`${dia}T12:00:00-03:00`) ?? dia}
              direita={
                <span className="flex items-center gap-2">
                  {ehHoje ? <Selo variante="destaque">hoje</Selo> : null}
                  {doDia === 1 ? "1 visita" : `${doDia} visitas`}
                </span>
              }
            />
            <ul>
              {itens.map((item) =>
                item.visita ? (
                  <ItemVisita
                    key={item.chave}
                    visita={item.visita}
                    limite={limiteVisitasDia}
                  />
                ) : item.sessao ? (
                  <ItemSessao key={item.chave} sessao={item.sessao} />
                ) : null,
              )}
            </ul>
          </Card>
        );
      })}
    </div>
  );
}

const LINHA =
  "border-fio-3 hover:bg-creme-3 grid grid-cols-[4.25rem_minmax(0,1fr)] gap-x-3 border-b px-4 py-3 last:border-b-0";

function ItemVisita({ visita: v }: { visita: VisitaAgenda; limite: number }) {
  return (
    <li
      data-visita={v.visitaId}
      data-conflito={v.conflitos.length > 0 ? "sim" : undefined}
      className={LINHA}
    >
      <p className="flex flex-col">
        <span className="font-mono text-[12.5px] font-semibold">
          {v.horaPrevista ?? "sem hora"}
        </span>
        {v.turno ? (
          <span className="text-tinta-50 text-[11px]">
            {ROTULO_TURNO[v.turno]}
          </span>
        ) : null}
      </p>
      <div className="flex min-w-0 flex-col gap-1.5">
        <div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-1">
          <p className="min-w-0 text-[13px]">
            <Link
              href={`/familias/${v.familiaId}`}
              className="font-semibold underline-offset-4 hover:underline"
            >
              {v.nomeExibicao}
            </Link>
          </p>
          <Selo variante="marinho">
            <span className="font-mono">D{v.diaNumero}</span> de{" "}
            {v.diasContratados}
          </Selo>
        </div>
        <p className="text-tinta-50 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11.5px]">
          {v.bairro ? (
            <span className="inline-flex items-center gap-1">
              <MapPin aria-hidden="true" className="size-3.5" />
              {v.bairro}
            </span>
          ) : null}
          <span className="inline-flex items-center gap-1">
            <UserRound aria-hidden="true" className="size-3.5" />
            {v.profissionalNome}
          </span>
          <span>{ROTULO_ESTADO_VISITA[v.estado]}</span>
        </p>
        {v.conflitos.length > 0 ? (
          <Nota tom="alerta" className="text-[11.5px]">
            <ul
              aria-label="Conflitos desta visita"
              className="flex flex-col gap-1"
            >
              {v.conflitos.map((c, i) => (
                <li key={`${c.codigo}-${i}`} className="flex items-start gap-2">
                  <TriangleAlert
                    className="mt-0.5 size-3.5 shrink-0"
                    aria-hidden="true"
                  />
                  {fraseConflito(c)}
                </li>
              ))}
            </ul>
          </Nota>
        ) : null}
        {v.movivel ? (
          <Botao
            asChild
            variante="secundario"
            tamanho="compacto"
            className="self-start"
          >
            <Link
              href={`/agenda/visitas/${v.visitaId}`}
              aria-label={`Reagendar o D${v.diaNumero} de ${v.nomeExibicao}`}
            >
              Reagendar
            </Link>
          </Botao>
        ) : null}
      </div>
    </li>
  );
}

function ItemSessao({ sessao: s }: { sessao: SessaoVenda }) {
  return (
    <li className={LINHA}>
      <p className="font-mono text-[12.5px] font-semibold">
        {s.agendadaPara ? horaEmBrasilia(s.agendadaPara) : ""}
      </p>
      <div className="flex min-w-0 flex-col gap-0.5">
        <p className="text-tinta-50 text-[11.5px]">Conversa de orientação</p>
        <p className="text-[13px] font-semibold">{s.nomeFamilia}</p>
        <p className="text-tinta-50 text-[11.5px]">
          {s.conduzidaPorNome
            ? `Conduz ${s.conduzidaPorNome}`
            : "Sem quem conduza definido"}
        </p>
        <Link
          href={`/sessoes-venda/${s.id}`}
          className="min-h-toque inline-flex items-center self-start text-[12.5px] underline underline-offset-4"
        >
          Abrir a conversa
        </Link>
      </div>
    </li>
  );
}
