import Link from "next/link";
import type { ReactNode } from "react";
import { Card, CardHead, Eyebrow } from "@/components/mockup";
import { Selo } from "@/components/ui/selo";
import type {
  Radar,
  RadarFamilia,
  RadarNasceu,
} from "@/lib/dados/tipos-operacao";
import { formatarData } from "@/lib/formatacao";
import { cn } from "@/lib/utils";
import { pontosDeAtencao } from "../agrupar";
import {
  deDia,
  montarCronograma,
  paraDia,
  type BarraFamilia,
  type PinNasceu,
  type SemanaCronograma,
} from "../cronograma";

const PCT = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 0 });
const curta = (iso: string) => formatarData(iso)?.slice(0, 5) ?? iso;
const plural = (n: number, um: string, varias: string) =>
  `${n} ${n === 1 ? um : varias}`;

/** Grade do mockup (`.radar-row`): família, trilha, situação. */
const GRADE = "grid grid-cols-[210px_minmax(0,1fr)_118px] items-center";

/** Fundo da coluna da semana: o cruzamento aparece na vertical. */
const FUNDO_COLUNA: Record<SemanaCronograma["destaque"], string> = {
  nenhum: "",
  capacidade: "bg-aviso-lavado",
  titular: "bg-alerta-lavado",
};

const ROTULO_PONTO: Record<string, string> = {
  sem_titular: "Sem titular",
  titular_sem_resposta: "Titular pendente",
  sem_backup: "Sem backup",
  backup_sem_resposta: "Backup pendente",
  dpp_sem_contato: "DPP sem sinal",
  dpp_sem_confirmacao: "DPP passou",
  checkin: "Check-in pendente",
  sem_contato: "Sem contato",
};

function Tag({
  variante,
  children,
  titulo,
}: {
  variante: "sucesso" | "alerta" | "aviso" | "neutro";
  children: ReactNode;
  titulo?: string;
}) {
  return (
    <Selo variante={variante} title={titulo}>
      <i aria-hidden="true" className="size-1.5 rounded-full bg-current" />
      {children}
    </Selo>
  );
}

function SituacaoFamilia({ f }: { f: RadarFamilia }) {
  const p = pontosDeAtencao(f)[0];
  if (!p) return <Tag variante="sucesso">Dupla aceita</Tag>;
  return (
    <Tag
      variante={
        p.tom === "alerta" ? "alerta" : p.tom === "aviso" ? "aviso" : "neutro"
      }
      titulo={p.texto}
    >
      {ROTULO_PONTO[p.chave] ?? p.texto}
    </Tag>
  );
}

function Hoje({ pct }: { pct: number }) {
  return (
    <span
      aria-hidden="true"
      className="bg-alerta absolute -top-1.5 -bottom-1.5 z-[1] w-px opacity-55"
      style={{ left: `${pct}%` }}
    />
  );
}

/** Trilha (`.track`): linha fina ao meio, colunas das semanas e a linha de hoje. */
function Trilha({
  semanas,
  hojePct,
  children,
}: {
  semanas: SemanaCronograma[];
  hojePct: number;
  children?: ReactNode;
}) {
  return (
    <div className="relative mx-3.5 h-[30px]">
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 -inset-y-3 grid"
        style={{
          gridTemplateColumns: `repeat(${semanas.length}, minmax(0, 1fr))`,
        }}
      >
        {semanas.map((s) => (
          <span key={s.inicio} className={cn(FUNDO_COLUNA[s.destaque])} />
        ))}
      </span>
      <span
        aria-hidden="true"
        className="bg-areia-clara absolute inset-x-0 top-[14px] h-0.5"
      />
      <Hoje pct={hojePct} />
      {children}
    </div>
  );
}

/** Marcador (`.pin`) com a data em mono acima. */
function Pino({
  rotulo,
  esq,
  real,
  titulo,
}: {
  rotulo: string;
  esq: number;
  real?: boolean;
  titulo: string;
}) {
  return (
    <span
      title={titulo}
      className={cn(
        "absolute -top-px z-[3] h-8 w-0.5",
        real ? "bg-sucesso" : "bg-marinho",
      )}
      style={{ left: `${esq}%` }}
    >
      <span
        className={cn(
          "absolute -top-3.5 left-1/2 -translate-x-1/2 font-mono text-[9.5px] whitespace-nowrap",
          real ? "text-sucesso" : "text-marinho",
        )}
      >
        {rotulo}
      </span>
    </span>
  );
}

function LinhaFamilia({
  b,
  semanas,
  hojePct,
}: {
  b: BarraFamilia;
  semanas: SemanaCronograma[];
  hojePct: number;
}) {
  const f = b.familia;
  const frase = `${f.nome}: janela da data provável de ${curta(f.dpp)} (estimativa).`;
  return (
    <div
      className={cn(
        GRADE,
        "border-fio-3 hover:bg-creme-3 border-b px-4 py-3 last:border-b-0",
      )}
    >
      <div className="min-w-0 pr-2">
        <Link
          href={`/radar/${f.familiaId}`}
          title={`Abrir alocação de ${f.nome}`}
          className="block truncate text-[13px] font-semibold underline-offset-2 hover:underline"
        >
          {f.nome}
        </Link>
        <div className="text-tinta-50 mt-px truncate text-[11px]">
          {[f.regiao, f.ig, f.titular?.nome ?? "a designar"]
            .filter(Boolean)
            .join(" · ")}
        </div>
      </div>
      <Trilha semanas={semanas} hojePct={hojePct}>
        <span
          title={frase}
          className={cn(
            "absolute top-[5px] z-[2] h-5 border",
            "border-dourado/35 from-dourado/10 via-dourado/40 to-dourado/10 bg-linear-to-r",
            b.cortadaAntes ? "rounded-l-none" : "rounded-l-pilula",
            b.cortadaDepois ? "rounded-r-none" : "rounded-r-pilula",
          )}
          style={{ left: `${b.esq}%`, width: `${b.larg}%` }}
        />
        {b.dppPct !== null ? (
          <Pino rotulo={`DPP ${curta(f.dpp)}`} esq={b.dppPct} titulo={frase} />
        ) : null}
      </Trilha>
      <div className="text-right">
        <SituacaoFamilia f={f} />
      </div>
    </div>
  );
}

function LinhaNasceu({
  p,
  n,
  semanas,
  hojePct,
}: {
  p: PinNasceu;
  n: RadarNasceu;
  semanas: SemanaCronograma[];
  hojePct: number;
}) {
  const data = formatarData(n.dataNascimento) ?? n.dataNascimento;
  const frase = `${n.nome}: nasceu em ${data}${p.antesDaRegua ? " (antes do início da régua)" : ""}.`;
  const larg = p.altaPct !== null ? Math.max(p.altaPct - p.pct, 1) : 0;
  return (
    <div
      className={cn(
        GRADE,
        "border-fio-3 hover:bg-creme-3 border-b px-4 py-3 last:border-b-0",
      )}
    >
      <div className="min-w-0 pr-2">
        <Link
          href={`/radar/${n.familiaId}`}
          className="block truncate text-[13px] font-semibold underline-offset-2 hover:underline"
        >
          {n.nome}
        </Link>
        <div className="text-tinta-50 mt-px truncate text-[11px]">
          {`Nasceu em ${data} · ${n.titular ?? "a designar"}`}
        </div>
      </div>
      <Trilha semanas={semanas} hojePct={hojePct}>
        {p.fora ? null : (
          <>
            {larg > 0 ? (
              <span
                title={`${n.nome}: datas firmes até a alta prevista.`}
                className="bg-sucesso border-sucesso absolute top-[5px] z-[2] h-5 rounded-md border"
                style={{ left: `${p.pct}%`, width: `${larg}%` }}
              />
            ) : null}
            <Pino
              rotulo={`nasceu ${curta(n.dataNascimento)}`}
              esq={p.pct}
              real
              titulo={frase}
            />
          </>
        )}
      </Trilha>
      <div className="text-right">
        {n.previsaoAlta ? (
          <Tag
            variante="sucesso"
            titulo={`Alta prevista para ${formatarData(n.previsaoAlta) ?? n.previsaoAlta} (estimativa).`}
          >
            Em atendimento
          </Tag>
        ) : (
          <Tag variante="aviso">Sem previsão de alta</Tag>
        )}
      </div>
    </div>
  );
}

function Legenda({
  janela,
  limitePct,
}: {
  janela: Radar["janela"];
  limitePct: number | null;
}) {
  return (
    <ul
      aria-label="Legenda do cronograma"
      className="text-tinta-50 flex flex-wrap gap-5 text-[11.5px]"
    >
      <li className="flex items-center gap-1.5">
        <span className="rounded-pilula border-dourado/35 from-dourado/10 via-dourado/40 to-dourado/10 inline-block h-2 w-[22px] border bg-linear-to-r" />
        {`período provável do parto (de ${janela.antes} dias antes a ${janela.depois} dias depois da DPP)`}
      </li>
      <li className="flex items-center gap-1.5">
        <span className="bg-sucesso inline-block h-2 w-[22px] rounded-[3px]" />
        datas firmes após o nascimento
      </li>
      <li className="flex items-center gap-1.5">
        <span className="bg-alerta inline-block h-[11px] w-0.5" />
        hoje
      </li>
      <li className="flex items-center gap-1.5">
        <span className="bg-alerta-lavado border-alerta-borda inline-block h-2 w-[22px] border" />
        semana com família sem titular
      </li>
      <li className="flex items-center gap-1.5">
        <span className="bg-aviso-lavado border-aviso-borda inline-block h-2 w-[22px] border" />
        {`semana com praça acima do limite${limitePct !== null ? ` de ${PCT.format(limitePct)}%` : ""}`}
      </li>
    </ul>
  );
}

/**
 * Radar de nascimentos (mockup `v-radar`, `.radar`): uma linha por família
 * sobre uma só régua de semanas, com a janela provável da DPP, o marcador da
 * data, a linha de hoje e a situação; abaixo, quem já nasceu com a faixa
 * firme até a alta prevista. As colunas das semanas ficam coloridas quando
 * há cruzamento (família sem titular ou praça acima do limite), de modo que
 * tudo aparece sincronizado na vertical. Grade CSS pura; no celular a régua
 * rola para os lados. A DPP é estimativa e só posiciona a barra.
 */
export function CronogramaRadar({ radar }: { radar: Radar }) {
  const c = montarCronograma(radar);
  const n = c.semanas.length;
  const visiveis = c.barras.filter((b) => !b.fora);
  const foraDaRegua = c.barras.length - visiveis.length;
  const marcas = [
    ...c.semanas.map((s) => s.inicio),
    deDia(paraDia(c.semanas[n - 1]!.inicio) + 7),
  ];
  const nasceu = new Map(radar.nasceram.map((x) => [x.familiaId, x]));
  const sem = visiveis.length === 0 && c.nasceram.length === 0;

  return (
    <Card id="cronograma">
      <CardHead
        titulo="Radar de nascimentos"
        direita={`Próximas ${n} semanas`}
      />
      <div
        role="region"
        aria-label="Radar por semanas, role para os lados no celular"
        tabIndex={0}
        className="overflow-x-auto"
      >
        <div className="min-w-[760px]">
          <div
            className={cn(GRADE, "border-linha items-end border-b px-4 pb-2")}
          >
            <Eyebrow>Família</Eyebrow>
            <div className="text-tinta-50 mx-3.5 flex justify-between font-mono text-[10px]">
              {marcas.map((m) => (
                <span key={m}>{curta(m)}</span>
              ))}
            </div>
            <Eyebrow className="text-right">Situação</Eyebrow>
          </div>

          {visiveis.map((b) => (
            <LinhaFamilia
              key={b.familia.familiaId}
              b={b}
              semanas={c.semanas}
              hojePct={c.hojePct}
            />
          ))}
          {c.nasceram.map((p) => {
            const info = nasceu.get(p.nasceu.familiaId);
            return info ? (
              <LinhaNasceu
                key={info.familiaId}
                p={p}
                n={info}
                semanas={c.semanas}
                hojePct={c.hojePct}
              />
            ) : null;
          })}
          {sem ? (
            <p className="text-tinta-50 px-4 py-6 text-[12.5px]">
              Nenhuma família cai na régua destas semanas.
            </p>
          ) : null}
        </div>
      </div>
      <div className="border-linha border-t p-4">
        <Legenda janela={radar.janela} limitePct={radar.limiteAlertaPct} />
        {foraDaRegua > 0 ? (
          <p className="text-tinta-50 mt-2 text-[11.5px]">
            {plural(foraDaRegua, "família está", "famílias estão")} com a janela
            fora das próximas {n} semanas e aparece só na lista abaixo.
          </p>
        ) : null}
      </div>
    </Card>
  );
}
