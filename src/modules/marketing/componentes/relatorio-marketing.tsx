import Link from "next/link";
import { TabelaLista } from "@/components/ui/tabela-lista";
import {
  GradeIndicadores,
  PainelGrafico,
} from "@/modules/inicio/painel-gestao";
import type {
  ContagensMarketing,
  FiltroPeriodo,
  RelatorioMarketing,
} from "@/lib/dados/tipos-relacao";
import { formatarData, formatarMoeda } from "@/lib/formatacao";
import { ROTULO_ORIGEM } from "@/modules/relacao/rotulos";
import { atalhosDePeriodo } from "../periodo";
import {
  FunilMarketing,
  PizzaCanais,
  fatiasDeCanais,
} from "./graficos-marketing";

const dividir = (a: number | null, b: number | null): number | null =>
  a !== null && b !== null && b > 0 ? Math.round(a / b) : null;

/** Atalho de período em pílula, no mesmo desenho das abas. */
const ATALHO =
  "rounded-pilula text-apoio text-texto hover:bg-areia-clara min-h-toque ease-estado inline-flex items-center px-3.5 font-semibold no-underline transition-colors duration-140";

const dinheiro = (v: number | null) =>
  v === null ? "sem acesso" : formatarMoeda(v);

/** Frase do topo do relatório: número em frase, sem grade de KPIs (DESIGN.md 11.10). */
export function fraseRelatorio(r: RelatorioMarketing): string {
  const t = r.total;
  const partes: string[] = [];
  partes.push(
    t.leads === 0
      ? "Nenhum lead entrou neste período."
      : `${t.leads} ${t.leads === 1 ? "lead entrou" : "leads entraram"} neste período, ${t.qualificados} qualificados e ${t.ganhos} com contrato.`,
  );
  if (r.veValores && t.receitaCentavos !== null) {
    partes.push(
      `Pagamentos confirmados: ${formatarMoeda(t.receitaCentavos)}, de ${t.contratosPagos ?? 0} ${t.contratosPagos === 1 ? "contrato" : "contratos"}.`,
    );
    if ((t.custoCentavos ?? 0) > 0) {
      partes.push(`Custo lançado: ${formatarMoeda(t.custoCentavos ?? 0)}.`);
    }
  }
  return partes.join(" ");
}

function textoPeriodo(p: FiltroPeriodo): string {
  if (!p.desde && !p.ate) return "Todo o período";
  const de = p.desde ? formatarData(p.desde) : "o começo";
  const ate = p.ate ? formatarData(p.ate) : "hoje";
  return `De ${de} a ${ate}`;
}

function celulasValores(c: ContagensMarketing) {
  return {
    leads: String(c.leads),
    qualificados: String(c.qualificados),
    ganhos: String(c.ganhos),
    receita: dinheiro(c.receitaCentavos),
    custo: dinheiro(c.custoCentavos),
    custoLead:
      c.custoCentavos === null
        ? "sem acesso"
        : dividir(c.custoCentavos, c.leads) !== null
          ? formatarMoeda(dividir(c.custoCentavos, c.leads)!)
          : "não se aplica",
    custoContrato:
      c.custoCentavos === null
        ? "sem acesso"
        : dividir(c.custoCentavos, c.contratosPagos) !== null
          ? formatarMoeda(dividir(c.custoCentavos, c.contratosPagos)!)
          : "não se aplica",
  };
}

/** Poucos leads: um lead a mais muda muito os percentuais. */
const POUCOS_LEADS = 10;

const plural = (n: number, um: string, varios: string) =>
  `${n} ${n === 1 ? um : varios}`;

/** Comparação com o período anterior, em frase. Sem período anterior, ensina como obter. */
function comparar(
  atual: number | null,
  anterior: number | null | undefined,
  tem: boolean,
  moeda = false,
): string {
  if (!tem)
    return "Escolha um período de início e fim para comparar com o anterior.";
  if (atual === null || anterior === null || anterior === undefined)
    return "Sem dado do período anterior para comparar.";
  const dif = atual - anterior;
  if (dif === 0) return "Igual ao período anterior.";
  const valor = moeda ? formatarMoeda(Math.abs(dif)) : String(Math.abs(dif));
  return `${valor} ${dif > 0 ? "a mais" : "a menos"} que no período anterior.`;
}

/** Aba "Visão geral": período, frase, indicadores, canais, funil e o dinheiro. */
export function RelatorioMarketingTela({
  relatorio,
  periodo,
  anterior,
}: {
  relatorio: RelatorioMarketing;
  periodo: FiltroPeriodo;
  /** Mesmo relatório no período anterior, quando o período tem as duas pontas. */
  anterior?: RelatorioMarketing | null;
}) {
  const atalhos = atalhosDePeriodo();
  const t = relatorio.total;
  const ant = anterior?.total ?? null;
  const tem = Boolean(periodo.desde && periodo.ate);
  const custoLead = dividir(t.custoCentavos, t.leads);
  const custoContrato = dividir(t.custoCentavos, t.contratosPagos);
  const filtro =
    periodo.desde || periodo.ate
      ? `&desde=${periodo.desde ?? ""}&ate=${periodo.ate ?? ""}`
      : "";
  const fatias = fatiasDeCanais(relatorio.porCanal);
  const anteriorPorCanal = anterior
    ? new Map(anterior.porCanal.map((c) => [c.canalId, c.leads]))
    : null;
  return (
    <div className="flex flex-col gap-6">
      <form
        method="get"
        className="rounded-3 border-linha bg-superficie flex flex-wrap items-end gap-3 border p-4"
        aria-label="Período do relatório"
      >
        <label className="text-apoio text-texto flex flex-col gap-1 font-semibold">
          De
          <input
            type="date"
            name="desde"
            defaultValue={periodo.desde ?? ""}
            className="rounded-2 border-borda-campo bg-superficie text-corpo min-h-toque border-[1.5px] px-3 font-normal"
          />
        </label>
        <label className="text-apoio text-texto flex flex-col gap-1 font-semibold">
          Até
          <input
            type="date"
            name="ate"
            defaultValue={periodo.ate ?? ""}
            className="rounded-2 border-borda-campo bg-superficie text-corpo min-h-toque border-[1.5px] px-3 font-normal"
          />
        </label>
        <button
          type="submit"
          className="rounded-pilula border-acao bg-acao text-acao-texto min-h-toque text-apoio border-[1.5px] px-5 font-semibold"
        >
          Ver período
        </button>
        <span className="bg-areia rounded-pilula flex flex-wrap gap-1 p-1">
          <Link
            className={ATALHO}
            href={`/marketing?desde=${atalhos.esteMes.desde}&ate=${atalhos.esteMes.ate}`}
          >
            Este mês
          </Link>
          <Link
            className={ATALHO}
            href={`/marketing?desde=${atalhos.mesPassado.desde}&ate=${atalhos.mesPassado.ate}`}
          >
            Mês passado
          </Link>
          <Link className={ATALHO} href="/marketing">
            Tudo
          </Link>
        </span>
      </form>

      <p
        className="text-3 text-texto max-w-[64ch]"
        data-teste="frase-relatorio"
      >
        <span className="text-texto-2">{textoPeriodo(periodo)}. </span>
        {fraseRelatorio(relatorio)}
      </p>

      {relatorio.soElegiveis ? (
        <p className="text-apoio text-texto-2 max-w-[64ch]">
          Este relatório conta só famílias que podem receber contato de
          marketing. A receita e o custo aparecem para a diretoria e o
          financeiro.
        </p>
      ) : null}

      <div className="[&>ul]:mt-0">
        <GradeIndicadores
          itens={[
            {
              rotulo: "Leads",
              valor: t.leads,
              contexto: comparar(t.leads, ant?.leads, tem),
              href: `/marketing?aba=canais${filtro}`,
              tom: "areia",
            },
            {
              rotulo: "Qualificados",
              valor: t.qualificados,
              contexto:
                t.leads > 0
                  ? `${Math.round((t.qualificados / t.leads) * 100)}% dos leads. ${comparar(t.qualificados, ant?.qualificados, tem)}`
                  : comparar(t.qualificados, ant?.qualificados, tem),
              href: "#funil",
              tom: "areia",
            },
            {
              rotulo: "Com contrato",
              valor: t.ganhos,
              contexto:
                t.qualificados > 0
                  ? `${Math.round((t.ganhos / t.qualificados) * 100)}% dos qualificados. ${comparar(t.ganhos, ant?.ganhos, tem)}`
                  : comparar(t.ganhos, ant?.ganhos, tem),
              href: "#funil",
              tom: "areia",
            },
            ...(relatorio.veValores
              ? [
                  {
                    rotulo: "Recebido",
                    valor: dinheiro(t.receitaCentavos),
                    contexto: `${plural(t.contratosPagos ?? 0, "contrato pago", "contratos pagos")}. ${comparar(t.receitaCentavos, ant?.receitaCentavos, tem, true)}`,
                    href: `/marketing?aba=canais${filtro}`,
                    tom: "salvia" as const,
                  },
                ]
              : []),
          ]}
        />
      </div>

      <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-2">
        <PainelGrafico
          titulo="De onde vêm os leads"
          nota="Leads do período, por canal."
          leitura={
            t.leads > 0 && t.leads < POUCOS_LEADS
              ? "Poucos leads no período: um a mais muda muito os percentuais."
              : undefined
          }
          vazio={
            fatias.length === 0
              ? "Nenhum lead por canal neste período. Quando uma família escrever pelo link de um canal, a fatia dele aparece aqui."
              : undefined
          }
        >
          <PizzaCanais fatias={fatias} anteriorPorCanal={anteriorPorCanal} />
        </PainelGrafico>

        <div id="funil" className="scroll-mt-24">
          <PainelGrafico
            titulo="Do lead ao contrato"
            nota="Quantas famílias chegam a cada etapa e quantas seguem para a próxima."
            vazio={
              t.leads === 0
                ? "Nenhum lead neste período. Quando entrar o primeiro, o funil mostra quantos qualificam e quantos fecham contrato."
                : undefined
            }
          >
            <FunilMarketing atual={t} anterior={ant} />
          </PainelGrafico>
        </div>
      </div>

      {relatorio.veValores ? (
        <div className="[&>ul]:mt-0">
          <GradeIndicadores
            itens={[
              {
                rotulo: "Custo lançado",
                valor: dinheiro(t.custoCentavos),
                contexto: comparar(
                  t.custoCentavos,
                  ant?.custoCentavos,
                  tem,
                  true,
                ),
                href: "/marketing?aba=canais",
                tom: "areia",
              },
              {
                rotulo: "Custo por lead",
                valor:
                  custoLead !== null ? formatarMoeda(custoLead) : "sem número",
                contexto:
                  custoLead !== null
                    ? `Custo lançado dividido por ${plural(t.leads, "lead", "leads")}.`
                    : "Sem lead ou sem custo lançado para dividir.",
                href: "/marketing?aba=canais",
                tom: "areia",
              },
              {
                rotulo: "Custo por contrato",
                valor:
                  custoContrato !== null
                    ? formatarMoeda(custoContrato)
                    : "sem número",
                contexto:
                  custoContrato !== null
                    ? `Custo lançado dividido por ${plural(t.contratosPagos ?? 0, "contrato pago", "contratos pagos")}.`
                    : "Sem contrato pago ou sem custo lançado para dividir.",
                href: "/marketing?aba=canais",
                tom: "areia",
              },
            ]}
          />
        </div>
      ) : null}
    </div>
  );
}

/** Aba "Canais e custos": as tabelas por origem e por canal. */
export function TabelasCanaisMarketing({
  relatorio,
}: {
  relatorio: RelatorioMarketing;
}) {
  const colunasBase = [
    { chave: "nome", rotulo: "", principal: true },
    { chave: "leads", rotulo: "Leads", numerica: true },
    { chave: "qualificados", rotulo: "Qualificados", numerica: true },
    { chave: "ganhos", rotulo: "Com contrato", numerica: true },
  ];
  const colunasValores = relatorio.veValores
    ? [
        { chave: "receita", rotulo: "Receita", numerica: true },
        { chave: "custo", rotulo: "Custo", numerica: true },
        { chave: "custoLead", rotulo: "Custo por lead", numerica: true },
        {
          chave: "custoContrato",
          rotulo: "Custo por contrato",
          numerica: true,
        },
      ]
    : [];
  const areia = "[&_thead_th]:bg-areia-clara";

  return (
    <div className="flex flex-col gap-4">
      <PainelGrafico
        titulo="Por canal"
        nota="Leads, receita e custo de cada canal de captação."
        vazio={
          relatorio.porCanal.length === 0
            ? "Nenhum canal ainda. Crie um canal abaixo, em Links por canal, para começar a medir de onde as famílias chegam."
            : undefined
        }
      >
        <TabelaLista
          className={areia}
          rotulo="Leads e receita por canal"
          colunas={[
            ...colunasBase.map((c) =>
              c.chave === "nome" ? { ...c, rotulo: "Canal" } : c,
            ),
            ...colunasValores,
          ]}
          linhas={relatorio.porCanal.map((c) => ({
            id: c.canalId,
            valores: {
              nome: `${c.nome} (${c.codigo})`,
              ...celulasValores(c),
            },
          }))}
        />
      </PainelGrafico>

      <PainelGrafico
        titulo="Por origem"
        nota="A origem que o canal ou a indicação gravou no cadastro."
        vazio={
          relatorio.porOrigem.length === 0
            ? "Nenhuma origem neste período. Quando entrar um lead, ele aparece aqui na origem que o canal ou a indicação gravou."
            : undefined
        }
      >
        <TabelaLista
          className={areia}
          rotulo="Leads e receita por origem"
          colunas={[
            ...colunasBase.map((c) =>
              c.chave === "nome" ? { ...c, rotulo: "Origem" } : c,
            ),
            ...colunasValores,
          ]}
          linhas={relatorio.porOrigem.map((o) => ({
            id: o.origem,
            valores: {
              nome: ROTULO_ORIGEM[o.origem],
              ...celulasValores(o),
            },
          }))}
        />
      </PainelGrafico>
    </div>
  );
}
