import Link from "next/link";
import type { ReactNode } from "react";
import {
  GradeIndicadores,
  PainelGrafico,
} from "@/modules/inicio/painel-gestao";
import { MantaDobrada } from "@/components/ilustracoes";
import { BarrasHorizontais, Colunas, Rosca } from "@/components/graficos";
import { VerComoTabela } from "@/components/graficos/ver-como-tabela";
import { EstadoVazio } from "@/components/ui/estado-vazio";
import { Selo } from "@/components/ui/selo";
import { TabelaLista } from "@/components/ui/tabela-lista";
import { formatarData, formatarMoeda } from "@/lib/formatacao";
import {
  dataCurta,
  formatarMoedaCurta,
  formatarPct,
  nomeMes,
  rotuloMes,
} from "@/lib/gestao/formato";
import { fatiasDeDespesa } from "../fatias-despesa";
import { somarMeses } from "@/lib/gestao/financeiro";
import { plural, ROTULO_CATEGORIA } from "../textos";
import type { VisaoFinanceira } from "../dados";

/** Frase de abertura da visão do mês. */
export function fraseDoMes(v: VisaoFinanceira): string {
  const { dre } = v;
  const mes = rotuloMes(dre.mes);
  if (dre.receitaCentavos === 0 && dre.despesasCentavos === 0) {
    return `Ainda não há recebimento nem despesa lançados em ${mes}.`;
  }
  const base = `Em ${mes} entraram ${formatarMoeda(dre.receitaCentavos)} e saíram ${formatarMoeda(dre.despesasCentavos)}. `;
  if (dre.receitaCentavos === 0) {
    return `${base}Sem recebimento no mês, ainda não há margem para calcular.`;
  }
  const sinal = dre.resultadoCentavos < 0 ? "negativo" : "positivo";
  return `${base}O resultado é ${sinal}, de ${formatarMoeda(dre.resultadoCentavos)}, com margem de ${formatarPct(dre.margemPct ?? 0)}.`;
}

function fraseInadimplencia(v: VisaoFinanceira): string {
  const i = v.inadimplencia;
  if (i.vencidasQtd === 0) return "Nenhuma cobrança em atraso hoje.";
  return `${plural(i.vencidasQtd, "cobrança está", "cobranças estão")} em atraso, somando ${formatarMoeda(i.vencidoCentavos)}${
    i.taxaPct !== null
      ? `. Isso é ${formatarPct(i.taxaPct)} de tudo o que já venceu ou foi pago`
      : ""
  }.`;
}

const CABECALHO_AREIA = "[&_thead_th]:bg-areia-clara";

function rotuloFaixa(deDias: number, ateDias: number | null): string {
  if (ateDias === null) return `Mais de ${deDias - 1} dias`;
  if (deDias === 1) return `Até ${ateDias} ${ateDias === 1 ? "dia" : "dias"}`;
  return `De ${deDias} a ${ateDias} dias`;
}

/** Painel do mesmo desenho do Painel executivo: cabeçalho em areia clara e corpo branco. */
function Bloco({
  id,
  titulo,
  apoio,
  children,
}: {
  id: string;
  titulo: string;
  apoio?: string;
  children: ReactNode;
}) {
  return (
    <div id={id} className="scroll-mt-24">
      <PainelGrafico titulo={titulo} nota={apoio}>
        <div className="flex flex-col gap-4">{children}</div>
      </PainelGrafico>
    </div>
  );
}

/** Comparação com o mês anterior, em frase. Sem mês anterior, diz isso. */
function delta(
  atual: number,
  anterior: number | undefined,
  mes: string,
): string {
  if (anterior === undefined) return "Sem mês anterior para comparar.";
  const dif = atual - anterior;
  const antes = nomeMes(somarMeses(mes, -1));
  if (dif === 0) return `Igual a ${antes}.`;
  return `${formatarMoeda(Math.abs(dif))} ${dif > 0 ? "a mais" : "a menos"} que em ${antes}.`;
}

/**
 * Visão do mês do financeiro (P46): DRE gerencial em regime de caixa,
 * inadimplência, previsão de recebimentos e os lançamentos que compõem o
 * DRE. O número do painel executivo vem das mesmas funções do banco. Tudo o
 * que é série vira gráfico; a tabela fica logo abaixo de cada um.
 */
export function VisaoFinanceiraTela({ v }: { v: VisaoFinanceira }) {
  const { dre, inadimplencia, previsao, lancamentos } = v;
  const i = dre.serie.findIndex((p) => p.mes === dre.mes);
  const ant = i > 0 ? dre.serie[i - 1] : undefined;
  const fatias = fatiasDeDespesa(
    dre.despesasPorCategoria.map((c) => ({
      rotulo: ROTULO_CATEGORIA[c.categoria],
      centavos: c.centavos,
    })),
  );
  const temSerie = dre.serie.some(
    (p) => p.receitaCentavos > 0 || p.despesasCentavos > 0,
  );
  const faixasComValor = inadimplencia.faixas.some((f) => f.centavos > 0);

  return (
    <div className="flex flex-col gap-6">
      {/* Faixa-resumo no mesmo desenho do Painel e do Início: quatro
          indicadores, cada um com a linha dos últimos meses e a comparação
          com o mês anterior escrita embaixo. */}
      <div className="[&>ul]:mt-0">
        <GradeIndicadores
          itens={[
            {
              rotulo: "Resultado do mês",
              valor: formatarMoeda(dre.resultadoCentavos),
              contexto: delta(
                dre.resultadoCentavos,
                ant?.resultadoCentavos,
                dre.mes,
              ),
              href: "#fin-serie",
              tom: "dourado",
              serie: dre.serie.map((p) => Math.max(p.resultadoCentavos, 0)),
              rotuloSerie: `Resultado nos últimos ${dre.serie.length} meses`,
              tomGrafico: "dourado",
            },
            {
              rotulo: "Entraram",
              valor: formatarMoeda(dre.receitaCentavos),
              contexto: delta(
                dre.receitaCentavos,
                ant?.receitaCentavos,
                dre.mes,
              ),
              href: "#fin-lanc",
              tom: "salvia",
              serie: dre.serie.map((p) => Math.max(p.receitaCentavos, 0)),
              rotuloSerie: `Entradas nos últimos ${dre.serie.length} meses`,
              tomGrafico: "sucesso",
            },
            {
              rotulo: "Saíram",
              valor: formatarMoeda(dre.despesasCentavos),
              contexto: delta(
                dre.despesasCentavos,
                ant?.despesasCentavos,
                dre.mes,
              ),
              href: "/financeiro/despesas",
              tom: "areia",
              serie: dre.serie.map((p) => Math.max(p.despesasCentavos, 0)),
              rotuloSerie: `Saídas nos últimos ${dre.serie.length} meses`,
              tomGrafico: "marinho",
            },
            {
              rotulo: "Margem",
              valor:
                dre.margemPct !== null
                  ? formatarPct(dre.margemPct)
                  : "sem número",
              contexto:
                dre.margemPct !== null
                  ? "Resultado dividido pelo que entrou no mês."
                  : "Sem recebimento no mês, ainda não há margem para calcular.",
              href: "#fin-serie",
              tom: "areia",
            },
          ]}
        />
      </div>

      <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-[62fr_38fr]">
        <Bloco
          id="fin-serie"
          titulo={`Entrou e saiu nos últimos ${dre.serie.length} meses`}
          apoio="Regime de caixa: conta o que foi pago no mês. Cobrança estornada ou cancelada não entra."
        >
          {temSerie ? (
            <Colunas
              formato="moeda"
              maxValoresNoTopo={6}
              altura={150}
              rotulo="Entrou e saiu por mês, em reais"
              legenda={["Entrou", "Saiu"]}
              tom="sucesso"
              tom2="marinho"
              itens={dre.serie.map((p) => ({
                rotulo: nomeMes(p.mes).slice(0, 3),
                valor: p.receitaCentavos,
                valor2: p.despesasCentavos,
                dica: [
                  rotuloMes(p.mes),
                  `Entrou: ${formatarMoeda(p.receitaCentavos)}`,
                  `Saiu: ${formatarMoeda(p.despesasCentavos)}`,
                  `Resultado: ${formatarMoeda(p.resultadoCentavos)}`,
                ],
              }))}
            />
          ) : (
            <p className="text-corpo text-texto-2 max-w-[60ch]">
              Os gráficos aparecem quando houver o primeiro recebimento ou a
              primeira despesa. Os recebimentos entram sozinhos quando uma
              cobrança é paga, e as despesas se lançam na tela de despesas.
            </p>
          )}
          <VerComoTabela
            rotulo="Entrou e saiu por mês"
            colunas={[
              { chave: "mes", rotulo: "Mês", principal: true },
              { chave: "receita", rotulo: "Entrou", numerica: true },
              { chave: "despesas", rotulo: "Saiu", numerica: true },
              { chave: "resultado", rotulo: "Resultado", numerica: true },
            ]}
            linhas={dre.serie.map((p) => ({
              id: p.mes,
              valores: {
                mes: rotuloMes(p.mes),
                receita: formatarMoeda(p.receitaCentavos),
                despesas: formatarMoeda(p.despesasCentavos),
                resultado: formatarMoeda(p.resultadoCentavos),
              },
            }))}
          />
        </Bloco>

        <Bloco
          id="fin-destino"
          titulo="Para onde foi o dinheiro"
          apoio={`Despesas de ${rotuloMes(dre.mes)} por categoria.`}
        >
          {fatias.length > 0 ? (
            <Rosca
              formato="moeda"
              espessura={44}
              centro={{ valor: "", legenda: "" }}
              rotulo={`Despesas de ${rotuloMes(dre.mes)} por categoria`}
              fatias={fatias}
            />
          ) : (
            <p className="text-corpo text-texto-2">
              Nenhuma despesa lançada neste mês. Quando houver, a divisão por
              categoria aparece aqui.
            </p>
          )}
        </Bloco>
      </div>

      <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-2">
        <Bloco
          id="fin-prev"
          titulo="Previsão de recebimentos"
          apoio={`${
            previsao.aVencerCentavos > 0
              ? `Vencem ${formatarMoeda(previsao.aVencerCentavos)} nos próximos ${previsao.meses.length} meses.`
              : `Nenhuma cobrança em aberto vence nos próximos ${previsao.meses.length} meses.`
          } ${
            previsao.atrasadasCentavos > 0
              ? `Mais ${formatarMoeda(previsao.atrasadasCentavos)} já venceram e seguem em aberto. `
              : ""
          }Só entram as cobranças que já existem.`}
        >
          {previsao.aVencerCentavos > 0 ? (
            <Colunas
              formato="moeda"
              maxValoresNoTopo={6}
              altura={150}
              rotulo="Cobranças em aberto que vencem em cada mês, em reais"
              tom="dourado"
              itens={previsao.meses.map((m) => ({
                rotulo: nomeMes(m.mes).slice(0, 3),
                valor: m.centavos,
                dica: [
                  rotuloMes(m.mes),
                  `A vencer: ${formatarMoeda(m.centavos)}`,
                  plural(m.qtd, "cobrança", "cobranças"),
                ],
              }))}
            />
          ) : (
            <p className="text-corpo text-texto-2 max-w-[60ch]">
              Quando um contrato gerar cobranças, as colunas mostram quanto
              vence em cada mês.
            </p>
          )}
        </Bloco>

        <Bloco
          id="fin-inad"
          titulo="Inadimplência"
          apoio={fraseInadimplencia(v)}
        >
          {faixasComValor ? (
            <BarrasHorizontais
              rotulo="Cobranças em atraso por faixa de dias"
              larguraRotulo="8rem"
              itens={inadimplencia.faixas.map((f) => ({
                rotulo: rotuloFaixa(f.deDias, f.ateDias),
                valor: f.centavos,
                tom: f.deDias > 30 ? "alerta" : "aviso",
                nota: formatarMoedaCurta(f.centavos),
                dica: `${rotuloFaixa(f.deDias, f.ateDias)}: ${formatarMoeda(f.centavos)}, ${plural(f.qtd, "cobrança", "cobranças")}`,
              }))}
            />
          ) : (
            <p className="text-corpo text-texto-2 max-w-[60ch]">
              Nenhuma cobrança em atraso. Se alguma vencer sem pagamento, as
              barras separam por quantos dias ela está atrasada.
            </p>
          )}
        </Bloco>
      </div>

      {inadimplencia.vencidasQtd > 0 ? (
        <Bloco id="fin-atraso" titulo="Cobranças em atraso">
          <TabelaLista
            className={CABECALHO_AREIA}
            rotulo="Cobranças em atraso"
            colunas={[
              { chave: "familia", rotulo: "Família", principal: true },
              { chave: "atraso", rotulo: "Atraso", canto: true },
              { chave: "valor", rotulo: "Valor", numerica: true },
              { chave: "vencimento", rotulo: "Vencimento" },
              { chave: "acao", rotulo: "Ação" },
            ]}
            linhas={inadimplencia.itens.map((c) => ({
              id: c.id,
              valores: {
                familia: c.familiaNome,
                atraso: (
                  <Selo variante={c.diasAtraso > 30 ? "alerta" : "aviso"}>
                    {plural(c.diasAtraso, "dia", "dias")}
                  </Selo>
                ),
                valor: formatarMoeda(c.valorCentavos),
                vencimento: formatarData(c.vencimento) ?? c.vencimento,
                acao: (
                  <Link
                    href={`/cobrancas/${c.id}`}
                    className="text-texto text-apoio min-h-toque inline-flex items-center font-semibold underline decoration-1 underline-offset-4"
                  >
                    Abrir cobrança
                  </Link>
                ),
              },
            }))}
          />
        </Bloco>
      ) : null}

      <Bloco
        id="fin-lanc"
        titulo={`Lançamentos de ${rotuloMes(lancamentos.mes)}`}
        apoio={`A soma destas linhas é o resultado do DRE: ${formatarMoeda(lancamentos.saldoCentavos)}.`}
      >
        {lancamentos.lancamentos.length === 0 ? (
          <EstadoVazio
            nivelTitulo="h3"
            ilustracao={<MantaDobrada tamanho={96} />}
            titulo="Nenhum lançamento neste mês"
            texto="Os recebimentos aparecem sozinhos quando uma cobrança é paga. As despesas você lança na tela de despesas."
          />
        ) : (
          <TabelaLista
            className={CABECALHO_AREIA}
            rotulo="Lançamentos do mês"
            colunas={[
              { chave: "data", rotulo: "Dia" },
              { chave: "descricao", rotulo: "Descrição", principal: true },
              { chave: "tipo", rotulo: "Tipo", canto: true },
              { chave: "valor", rotulo: "Valor", numerica: true },
            ]}
            linhas={lancamentos.lancamentos.map((l) => ({
              id: `${l.tipo}-${l.id}`,
              valores: {
                data: dataCurta(l.data),
                descricao: l.descricao,
                tipo: (
                  <Selo variante={l.tipo === "receita" ? "sucesso" : "neutro"}>
                    {l.tipo === "receita" ? "Recebimento" : "Despesa"}
                  </Selo>
                ),
                valor:
                  l.tipo === "receita"
                    ? formatarMoeda(l.valorCentavos)
                    : `-${formatarMoeda(l.valorCentavos)}`,
              },
            }))}
          />
        )}
      </Bloco>
    </div>
  );
}
