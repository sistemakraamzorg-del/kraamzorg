import Link from "next/link";
import { CardBody, Nota, classesChip } from "@/components/mockup";
import { TabelaLista } from "@/components/ui/tabela-lista";
import { formatarMoedaCurta, formatarPct } from "@/lib/gestao/formato";
import {
  BarrasMock,
  RoscaMock,
  type FatiaMock,
  type TomMock,
} from "@/modules/financeiro/graficos-mock";
import {
  BlocoTabela,
  CartaoGrafico,
  CLASSE_TABELA,
  Grade,
  SemDado,
} from "@/modules/financeiro/mockup-ui";
import type {
  ContagensMarketing,
  FiltroPeriodo,
  RelatorioMarketing,
} from "@/lib/dados/tipos-relacao";
import { formatarData, formatarMoeda } from "@/lib/formatacao";
import { ROTULO_ORIGEM } from "@/modules/relacao/rotulos";
import { atalhosDePeriodo } from "../periodo";

const dividir = (a: number | null, b: number | null): number | null =>
  a !== null && b !== null && b > 0 ? Math.round(a / b) : null;

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

const TONS_ORIGEM: TomMock[] = [
  "dourado2",
  "dourado",
  "sucesso",
  "azul",
  "areia",
  "sensivel",
];

/** As maiores origens e o resto junto, nos tons do mockup. */
function fatiasPorOrigem(
  linhas: RelatorioMarketing["porOrigem"],
  valor: (l: RelatorioMarketing["porOrigem"][number]) => number,
): FatiaMock[] {
  const ordenadas = linhas
    .map((l) => ({ rotulo: ROTULO_ORIGEM[l.origem], v: valor(l) }))
    .filter((l) => l.v > 0)
    .sort((x, y) => y.v - x.v);
  const topo = ordenadas.slice(0, TONS_ORIGEM.length - 1);
  const resto = ordenadas.slice(TONS_ORIGEM.length - 1);
  const fatias = topo.map((l, i) => ({
    rotulo: l.rotulo,
    valor: l.v,
    tom: TONS_ORIGEM[i]!,
  }));
  if (resto.length > 0) {
    fatias.push({
      rotulo: "Outras origens",
      valor: resto.reduce((a, l) => a + l.v, 0),
      tom: TONS_ORIGEM[TONS_ORIGEM.length - 1]!,
    });
  }
  return fatias;
}

/** Texto do argumento do módulo, com os percentuais do próprio período. */
function argumentoDoModulo(r: RelatorioMarketing): string | null {
  if (!r.veValores) return null;
  const totalLeads = r.porOrigem.reduce((a, l) => a + l.leads, 0);
  const totalReceita = r.porOrigem.reduce(
    (a, l) => a + (l.receitaCentavos ?? 0),
    0,
  );
  if (totalLeads === 0 || totalReceita === 0) return null;
  const pct = (n: number, t: number) => Math.round((n / t) * 100);
  const maisLeads = [...r.porOrigem].sort((x, y) => y.leads - x.leads)[0]!;
  const maisReceita = [...r.porOrigem].sort(
    (x, y) => (y.receitaCentavos ?? 0) - (x.receitaCentavos ?? 0),
  )[0]!;
  const frase = (l: typeof maisLeads) =>
    `${ROTULO_ORIGEM[l.origem]} traz ${pct(l.leads, totalLeads)}% dos leads e ${pct(l.receitaCentavos ?? 0, totalReceita)}% da receita.`;
  return maisLeads.origem === maisReceita.origem
    ? frase(maisLeads)
    : `${frase(maisLeads)} ${frase(maisReceita)}`;
}

/** Aba "Visão geral": período, origem dos leads e da receita, desempenho por origem e custos. */
export function RelatorioMarketingTela({
  relatorio,
  periodo,
}: {
  relatorio: RelatorioMarketing;
  periodo: FiltroPeriodo;
  /** Mesmo relatório no período anterior (a tela de mockup não compara períodos). */
  anterior?: RelatorioMarketing | null;
}) {
  const atalhos = atalhosDePeriodo();
  const t = relatorio.total;
  const leadsPorOrigem = fatiasPorOrigem(relatorio.porOrigem, (l) => l.leads);
  const receitaPorOrigem = fatiasPorOrigem(
    relatorio.porOrigem,
    (l) => l.receitaCentavos ?? 0,
  );
  const argumento = argumentoDoModulo(relatorio);
  const cplPorCanal = relatorio.porCanal
    .map((c) => ({ nome: c.nome, cpl: dividir(c.custoCentavos, c.leads) }))
    .filter((c) => c.cpl !== null);
  const campo =
    "rounded-2 border-borda-campo bg-superficie text-[12.5px] min-h-toque border-[1.5px] px-3 font-normal";
  return (
    <div className="flex flex-col gap-3.5">
      <form
        method="get"
        className="flex flex-wrap items-end gap-3"
        aria-label="Período do relatório"
      >
        <label className="text-tinta-70 flex flex-col gap-1 text-[11.5px] font-semibold">
          De
          <input
            type="date"
            name="desde"
            defaultValue={periodo.desde ?? ""}
            className={campo}
          />
        </label>
        <label className="text-tinta-70 flex flex-col gap-1 text-[11.5px] font-semibold">
          Até
          <input
            type="date"
            name="ate"
            defaultValue={periodo.ate ?? ""}
            className={campo}
          />
        </label>
        <button type="submit" className={`${classesChip(true)} min-h-toque`}>
          Ver período
        </button>
        <span className="flex flex-wrap gap-1.5">
          <Link
            className={`${classesChip()} min-h-toque no-underline`}
            href={`/marketing?desde=${atalhos.esteMes.desde}&ate=${atalhos.esteMes.ate}`}
          >
            Este mês
          </Link>
          <Link
            className={`${classesChip()} min-h-toque no-underline`}
            href={`/marketing?desde=${atalhos.mesPassado.desde}&ate=${atalhos.mesPassado.ate}`}
          >
            Mês passado
          </Link>
          <Link
            className={`${classesChip()} min-h-toque no-underline`}
            href="/marketing"
          >
            Tudo
          </Link>
        </span>
      </form>

      <p
        className="text-tinta-70 max-w-[64ch] text-[13px] leading-[1.6]"
        data-teste="frase-relatorio"
      >
        <span className="text-tinta-50">{textoPeriodo(periodo)}. </span>
        {fraseRelatorio(relatorio)}
      </p>

      {relatorio.soElegiveis ? (
        <p className="text-tinta-50 max-w-[64ch] text-[11.5px] leading-[1.6]">
          Este relatório conta só famílias que podem receber contato de
          marketing. A receita e o custo aparecem para a diretoria e o
          financeiro.
        </p>
      ) : null}

      <Grade colunas={2}>
        <CartaoGrafico titulo="Leads por origem" nota="no período">
          {leadsPorOrigem.length === 0 ? (
            <SemDado>
              Nenhum lead neste período. Quando uma família escrever, a origem
              aparece aqui.
            </SemDado>
          ) : (
            <RoscaMock
              rotulo="Leads por origem"
              centro={String(t.leads)}
              sub="leads"
              fatias={leadsPorOrigem}
            />
          )}
        </CartaoGrafico>
        <CartaoGrafico
          titulo="Receita por origem"
          nota="a mesma base, outra ordem"
        >
          {!relatorio.veValores ? (
            <SemDado>
              A receita aparece para a diretoria e o financeiro.
            </SemDado>
          ) : receitaPorOrigem.length === 0 ? (
            <SemDado>
              Nenhum pagamento confirmado neste período. Quando um contrato for
              pago, a origem dele aparece aqui.
            </SemDado>
          ) : (
            <RoscaMock
              rotulo="Receita por origem"
              formato="moeda"
              centro={formatarMoedaCurta(t.receitaCentavos ?? 0).replace(
                "R$ ",
                "R$",
              )}
              sub="receita"
              fatias={receitaPorOrigem}
            />
          )}
        </CartaoGrafico>
      </Grade>

      {argumento ? (
        <Nota>
          <b>Os dois gráficos acima são o argumento inteiro do módulo.</b>{" "}
          {argumento} Sem atribuição até o contrato, essa diferença fica
          invisível e a verba continua indo para o canal errado.
        </Nota>
      ) : null}

      <BlocoTabela
        titulo="Desempenho por origem"
        direita="Da entrada do lead até o contrato"
      >
        {relatorio.porOrigem.length === 0 ? (
          <CardBody>
            <SemDado>
              Nenhuma origem neste período. Quando entrar um lead, ele aparece
              aqui na origem que o canal ou a indicação gravou.
            </SemDado>
          </CardBody>
        ) : (
          <TabelaOrigens relatorio={relatorio} />
        )}
      </BlocoTabela>

      <Grade colunas={3}>
        <CartaoGrafico titulo="Custo por lead por canal" nota="no período">
          {!relatorio.veValores ? (
            <SemDado>O custo aparece para a diretoria e o financeiro.</SemDado>
          ) : cplPorCanal.length === 0 ? (
            <SemDado>
              Sem custo lançado e lead no mesmo canal para dividir. O custo se
              lança na aba Canais e custos.
            </SemDado>
          ) : (
            <BarrasMock
              altura={160}
              larguraInicial={340}
              formato="moeda"
              rotulo="Custo por lead de cada canal, em reais"
              rotulos={cplPorCanal.map((c) => c.nome)}
              series={[
                {
                  nome: "Custo por lead",
                  tom: "aviso",
                  valores: cplPorCanal.map((c) => c.cpl ?? 0),
                },
              ]}
            />
          )}
        </CartaoGrafico>
        <CartaoGrafico titulo="Investimento × receita" nota="no período">
          {!relatorio.veValores ? (
            <SemDado>
              O investimento e a receita aparecem para a diretoria e o
              financeiro.
            </SemDado>
          ) : (
            <BarrasMock
              altura={160}
              larguraInicial={340}
              formato="moeda"
              rotulo="Investimento e receita do período, em reais"
              rotulos={["Período"]}
              series={[
                {
                  nome: "Investido",
                  tom: "alerta",
                  valores: [t.custoCentavos ?? 0],
                },
                {
                  nome: "Receita",
                  tom: "sucesso",
                  valores: [t.receitaCentavos ?? 0],
                },
              ]}
            />
          )}
        </CartaoGrafico>
        <CartaoGrafico titulo="Tempo até o contrato" nota="dias, por origem">
          <SemDado>
            O sistema ainda não mede os dias entre o lead e o contrato por
            origem. Quando medir, as barras aparecem aqui.
          </SemDado>
        </CartaoGrafico>
      </Grade>
    </div>
  );
}

/** Tabela "Desempenho por origem" do mockup, com os números do período. */
function TabelaOrigens({ relatorio }: { relatorio: RelatorioMarketing }) {
  const valores = relatorio.veValores;
  return (
    <TabelaLista
      className={CLASSE_TABELA}
      rotulo="Leads e receita por origem"
      colunas={[
        { chave: "nome", rotulo: "Origem", principal: true },
        { chave: "leads", rotulo: "Leads", numerica: true },
        { chave: "qualificados", rotulo: "Qualif.", numerica: true },
        { chave: "ganhos", rotulo: "Contratos", numerica: true },
        { chave: "conversao", rotulo: "Conversão", numerica: true },
        ...(valores
          ? [
              { chave: "custo", rotulo: "Investimento", numerica: true },
              { chave: "cac", rotulo: "CAC", numerica: true },
              { chave: "receita", rotulo: "Receita", numerica: true },
            ]
          : []),
      ]}
      linhas={relatorio.porOrigem.map((o) => {
        const cac = dividir(o.custoCentavos, o.contratosPagos);
        return {
          id: o.origem,
          valores: {
            nome: (
              <span className="font-semibold">{ROTULO_ORIGEM[o.origem]}</span>
            ),
            leads: String(o.leads),
            qualificados: String(o.qualificados),
            ganhos: String(o.ganhos),
            conversao:
              o.leads > 0
                ? formatarPct((o.ganhos / o.leads) * 100)
                : "sem número",
            custo: dinheiro(o.custoCentavos),
            cac: cac === null ? "sem número" : formatarMoeda(cac),
            receita:
              o.receitaCentavos === null || o.receitaCentavos === 0
                ? "sem número"
                : formatarMoeda(o.receitaCentavos),
          },
        };
      })}
    />
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
  return (
    <div className="flex flex-col gap-3.5">
      <BlocoTabela
        titulo="Por canal"
        direita="Leads, receita e custo de cada canal de captação"
      >
        {relatorio.porCanal.length === 0 ? (
          <CardBody>
            <SemDado>
              Nenhum canal ainda. Crie um canal abaixo, em Links por canal, para
              começar a medir de onde as famílias chegam.
            </SemDado>
          </CardBody>
        ) : (
          <TabelaLista
            className={CLASSE_TABELA}
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
        )}
      </BlocoTabela>
    </div>
  );
}
