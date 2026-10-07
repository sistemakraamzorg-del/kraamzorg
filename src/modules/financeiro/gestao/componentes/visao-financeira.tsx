import Link from "next/link";
import { MantaDobrada } from "@/components/ilustracoes";
import { Barra, Card, CardHead, Nota, tabelaMock } from "@/components/mockup";
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
import { somarMeses } from "@/lib/gestao/financeiro";
import {
  BarrasMock,
  HBarrasMock,
  MedidorMock,
  MiniLinhaMock,
  RoscaMock,
} from "../../graficos-mock";
import {
  BlocoTabela,
  CartaoGrafico,
  CLASSE_TABELA,
  Grade,
  KpiLinha,
  SemDado,
} from "../../mockup-ui";
import { fatiasDeDespesaMock } from "../fatias-despesa";
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

function rotuloFaixa(deDias: number, ateDias: number | null): string {
  if (ateDias === null) return `Mais de ${deDias - 1} dias`;
  if (deDias === 1) return `Até ${ateDias} ${ateDias === 1 ? "dia" : "dias"}`;
  return `De ${deDias} a ${ateDias} dias`;
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

/** Valor em reais cheio no número grande do indicador. */
const sem = "sem número";

/**
 * Visão do mês do financeiro (P46) no desenho do HTML de referência da
 * cliente: quatro indicadores, receita e custo, composição do custo,
 * previsão, margem por pacote, inadimplência, contas a receber, pagamento da
 * equipe e DRE gerencial. O DRE é em regime de caixa e o número é o mesmo do
 * painel executivo (mesmas funções do banco).
 */
export function VisaoFinanceiraTela({ v }: { v: VisaoFinanceira }) {
  const { dre, inadimplencia, previsao, lancamentos, equipe } = v;
  const i = dre.serie.findIndex((p) => p.mes === dre.mes);
  const ant = i > 0 ? dre.serie[i - 1] : undefined;
  const fatias = fatiasDeDespesaMock(
    dre.despesasPorCategoria.map((c) => ({
      rotulo: ROTULO_CATEGORIA[c.categoria],
      centavos: c.centavos,
    })),
  );
  const temSerie = dre.serie.some(
    (p) => p.receitaCentavos > 0 || p.despesasCentavos > 0,
  );
  const faixasComValor = inadimplencia.faixas.some((f) => f.centavos > 0);
  const assistencial =
    dre.despesasPorCategoria.find((c) => c.categoria === "equipe_assistencial")
      ?.centavos ?? 0;
  const margens = dre.serie.map((p) =>
    p.receitaCentavos > 0 ? (p.resultadoCentavos / p.receitaCentavos) * 100 : 0,
  );
  const aReceber = previsao.aVencerCentavos + previsao.atrasadasCentavos;
  const pctDaReceita = (centavos: number): number | null =>
    dre.receitaCentavos > 0 ? (centavos / dre.receitaCentavos) * 100 : null;

  // Pagamento da equipe do mês, somado por profissional.
  const porProfissional = new Map<
    string,
    { nome: string; visitas: number; totalCentavos: number }
  >();
  for (const p of equipe?.pagamentos ?? []) {
    const atual = porProfissional.get(p.profissionalId) ?? {
      nome: p.profissionalNome,
      visitas: 0,
      totalCentavos: 0,
    };
    atual.visitas += p.visitas;
    atual.totalCentavos += p.totalCentavos;
    porProfissional.set(p.profissionalId, atual);
  }
  const profissionais = [...porProfissional.entries()].sort((x, y) =>
    x[1].nome.localeCompare(y[1].nome, "pt-BR"),
  );

  const linhasDre = dre.despesasPorCategoria
    .filter((c) => c.centavos > 0)
    .sort((x, y) => y.centavos - x.centavos);
  const contagemCategoria = (chave: string) =>
    lancamentos.lancamentos.filter(
      (l) => l.tipo === "despesa" && l.categoria === chave,
    ).length;
  const recebimentos = lancamentos.lancamentos.filter(
    (l) => l.tipo === "receita",
  ).length;

  return (
    <div className="flex flex-col gap-3.5">
      <Grade colunas={4} data-tour="/financeiro:numeros">
        <KpiLinha
          rotulo="Receita do mês"
          valor={formatarMoeda(dre.receitaCentavos)}
          grafico={
            <MiniLinhaMock
              valores={dre.serie.map((p) => p.receitaCentavos)}
              rotulo={`Entradas nos últimos ${dre.serie.length} meses`}
            />
          }
          delta={delta(dre.receitaCentavos, ant?.receitaCentavos, dre.mes)}
        />
        <KpiLinha
          rotulo="A receber"
          valor={formatarMoeda(aReceber)}
          grafico={
            <MiniLinhaMock
              valores={previsao.meses.map((m) => m.centavos)}
              tom="aviso"
              rotulo={`Cobranças em aberto por mês de vencimento`}
            />
          }
          delta={
            previsao.atrasadasCentavos > 0
              ? `${formatarMoeda(previsao.atrasadasCentavos)} já venceram e seguem em aberto.`
              : previsao.aVencerCentavos > 0
                ? "Nada vencido em aberto."
                : "Nenhuma cobrança em aberto."
          }
        />
        <KpiLinha
          rotulo="Custo assistencial"
          valor={formatarMoeda(assistencial)}
          grafico={<MiniLinhaMock valores={[]} rotulo="Custo assistencial" />}
          delta={
            pctDaReceita(assistencial) === null
              ? "Sem recebimento no mês para comparar."
              : `${formatarPct(pctDaReceita(assistencial)!)} da receita.`
          }
        />
        <KpiLinha
          rotulo="Margem"
          valor={dre.margemPct === null ? sem : formatarPct(dre.margemPct)}
          grafico={
            <MiniLinhaMock
              valores={margens}
              tom="sucesso"
              rotulo={`Margem nos últimos ${dre.serie.length} meses`}
            />
          }
          delta={
            dre.margemPct === null
              ? "Sem recebimento no mês, ainda não há margem para calcular."
              : "Resultado dividido pelo que entrou no mês."
          }
        />
      </Grade>

      <Grade colunas={2}>
        <CartaoGrafico
          titulo="Receita, custo e margem"
          nota={`últimos ${dre.serie.length} meses`}
        >
          {temSerie ? (
            <BarrasMock
              altura={210}
              formato="moeda"
              rotulo="Entrou, saiu e resultado por mês, em reais"
              rotulos={dre.serie.map((p) => nomeMes(p.mes).slice(0, 3))}
              series={[
                {
                  nome: "Receita",
                  tom: "dourado",
                  valores: dre.serie.map((p) => p.receitaCentavos),
                },
                {
                  nome: "Custo total",
                  tom: "alerta",
                  valores: dre.serie.map((p) => p.despesasCentavos),
                },
                {
                  nome: "Resultado",
                  tom: "sucesso",
                  valores: dre.serie.map((p) =>
                    Math.max(p.resultadoCentavos, 0),
                  ),
                },
              ]}
            />
          ) : (
            <SemDado>
              Os gráficos aparecem quando houver o primeiro recebimento ou a
              primeira despesa. Os recebimentos entram sozinhos quando uma
              cobrança é paga, e as despesas se lançam na tela de despesas.
            </SemDado>
          )}
          <p className="text-tinta-50 mt-2 text-[11.5px]">
            Regime de caixa: conta o que foi pago no mês. Cobrança estornada ou
            cancelada não entra.
          </p>
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
        </CartaoGrafico>
        <CartaoGrafico titulo="Composição do custo" nota={nomeMes(dre.mes)}>
          {fatias.length > 0 ? (
            <RoscaMock
              rotulo={`Despesas de ${rotuloMes(dre.mes)} por categoria`}
              formato="moeda"
              centro={formatarMoedaCurta(dre.despesasCentavos).replace(
                "R$ ",
                "R$",
              )}
              sub="custo total"
              fatias={fatias}
            />
          ) : (
            <SemDado>
              Nenhuma despesa lançada neste mês. Quando houver, a divisão por
              categoria aparece aqui.
            </SemDado>
          )}
        </CartaoGrafico>
      </Grade>

      <Grade colunas={3}>
        <CartaoGrafico
          titulo="Previsão de recebimento"
          nota={`próximos ${previsao.meses.length} meses`}
        >
          {previsao.aVencerCentavos > 0 ? (
            <BarrasMock
              altura={165}
              larguraInicial={340}
              formato="moeda"
              rotulo="Cobranças em aberto que vencem em cada mês, em reais"
              rotulos={previsao.meses.map((m) => nomeMes(m.mes).slice(0, 3))}
              series={[
                {
                  nome: "Previsto",
                  tom: "dourado",
                  valores: previsao.meses.map((m) => m.centavos),
                },
              ]}
            />
          ) : (
            <SemDado>
              Quando um contrato gerar cobranças, as colunas mostram quanto
              vence em cada mês. Só entram as cobranças que já existem.
            </SemDado>
          )}
        </CartaoGrafico>
        <CartaoGrafico titulo="Margem por pacote" nota="por família atendida">
          <SemDado>
            O sistema ainda não calcula a margem por pacote. Quando o custo de
            cada família estiver ligado ao pacote do contrato, as barras
            aparecem aqui.
          </SemDado>
        </CartaoGrafico>
        <CartaoGrafico
          titulo="Inadimplência"
          nota="sobre o que já venceu ou foi pago"
        >
          {inadimplencia.taxaPct === null ? (
            <SemDado>
              Ainda não há cobrança emitida para calcular a inadimplência.
            </SemDado>
          ) : (
            <MedidorMock
              valor={inadimplencia.taxaPct}
              legenda={nomeMes(dre.mes)}
              tom={inadimplencia.vencidasQtd > 0 ? "aviso" : "sucesso"}
              rotulo={`Inadimplência de ${formatarPct(inadimplencia.taxaPct)}`}
            />
          )}
          <p className="text-tinta-50 mt-1.5 text-center text-[11.5px]">
            {fraseInadimplencia(v)}
          </p>
          {faixasComValor ? (
            <div className="mt-3">
              <HBarrasMock
                rotulo="Cobranças em atraso por faixa de dias"
                rotuloLargura={104}
                direita={78}
                linhas={inadimplencia.faixas.map((f) => ({
                  rotulo: rotuloFaixa(f.deDias, f.ateDias),
                  valor: f.centavos,
                  tom: f.deDias > 30 ? "alerta" : "aviso",
                  nota: formatarMoedaCurta(f.centavos),
                }))}
              />
            </div>
          ) : null}
        </CartaoGrafico>
      </Grade>

      <div className="grid grid-cols-1 items-start gap-3.5 min-[900px]:grid-cols-[1fr_340px]">
        <BlocoTabela
          id="fin-atraso"
          idTour="/financeiro:atrasos"
          titulo="Contas a receber"
          direita="em atraso"
          rodape={
            <Link
              href="/cobrancas"
              className="text-tinta min-h-toque inline-flex items-center text-[12.5px] font-semibold underline decoration-1 underline-offset-4"
            >
              Ver todas as cobranças
            </Link>
          }
        >
          {inadimplencia.vencidasQtd > 0 ? (
            <TabelaLista
              className={CLASSE_TABELA}
              rotulo="Cobranças em atraso"
              colunas={[
                { chave: "familia", rotulo: "Família", principal: true },
                { chave: "atraso", rotulo: "Situação", canto: true },
                { chave: "valor", rotulo: "Valor", numerica: true },
                { chave: "vencimento", rotulo: "Vencimento" },
                { chave: "acao", rotulo: "Ação" },
              ]}
              linhas={inadimplencia.itens.map((c) => ({
                id: c.id,
                valores: {
                  familia: (
                    <span className="font-semibold">{c.familiaNome}</span>
                  ),
                  atraso: (
                    <Selo variante={c.diasAtraso > 30 ? "alerta" : "aviso"}>
                      Atrasada {c.diasAtraso}d
                    </Selo>
                  ),
                  valor: formatarMoeda(c.valorCentavos),
                  vencimento: formatarData(c.vencimento) ?? c.vencimento,
                  acao: (
                    <Link
                      href={`/cobrancas/${c.id}`}
                      className="text-tinta min-h-toque inline-flex items-center text-[12.5px] font-semibold underline decoration-1 underline-offset-4"
                    >
                      Abrir cobrança
                    </Link>
                  ),
                },
              }))}
            />
          ) : (
            <div className="px-4 py-3">
              <SemDado>
                Nenhuma cobrança em atraso. As que esperam pagamento estão na
                lista de cobranças.
              </SemDado>
            </div>
          )}
        </BlocoTabela>

        <BlocoTabela
          titulo="Pagamento de equipe"
          direita={nomeMes(dre.mes)}
          rodape={
            <p className="text-tinta-50 text-[11.5px] leading-[1.6]">
              O pagamento nasce da visita concluída e fica liberado só depois do
              envio das evoluções aos médicos.{" "}
              <Link
                href={`/financeiro/equipe`}
                className="text-tinta font-semibold underline decoration-1 underline-offset-4"
              >
                Ver o pagamento da equipe
              </Link>
              .
            </p>
          }
        >
          {profissionais.length > 0 ? (
            <TabelaLista
              className={CLASSE_TABELA}
              rotulo="Pagamento da equipe no mês, por profissional"
              colunas={[
                { chave: "nome", rotulo: "Profissional", principal: true },
                { chave: "visitas", rotulo: "Visitas", numerica: true },
                { chave: "total", rotulo: "Previsto", numerica: true },
              ]}
              linhas={profissionais.map(([id, p]) => ({
                id,
                valores: {
                  nome: <span className="font-semibold">{p.nome}</span>,
                  visitas: String(p.visitas),
                  total: formatarMoeda(p.totalCentavos),
                },
              }))}
            />
          ) : (
            <div className="px-4 py-3">
              <SemDado>
                {equipe
                  ? "Nenhuma visita realizada neste mês para gerar pagamento."
                  : "Não foi possível ler o pagamento da equipe agora. Recarregue a página; nada foi alterado."}
              </SemDado>
            </div>
          )}
        </BlocoTabela>
      </div>

      <Card id="fin-dre" className="scroll-mt-24">
        <CardHead titulo={`DRE gerencial, ${rotuloMes(dre.mes)}`} />
        <div className="overflow-x-auto">
          <table className={tabelaMock.tabela}>
            <caption className="sr-only">
              DRE gerencial do mês, em regime de caixa
            </caption>
            <thead>
              <tr>
                <th scope="col" className={tabelaMock.th}>
                  Linha
                </th>
                <th scope="col" className={`${tabelaMock.th} w-[140px]`}>
                  Valor
                </th>
                <th scope="col" className={`${tabelaMock.th} w-[100px]`}>
                  % receita
                </th>
                <th scope="col" className={`${tabelaMock.th} w-[180px]`}>
                  <span className="sr-only">Proporção</span>
                </th>
                <th scope="col" className={tabelaMock.th}>
                  Composição
                </th>
              </tr>
            </thead>
            <tbody>
              <tr className={tabelaMock.tr}>
                <td className={`${tabelaMock.td} ${tabelaMock.nome}`}>
                  Receita
                </td>
                <td className={`${tabelaMock.td} font-mono text-[11.5px]`}>
                  {formatarMoeda(dre.receitaCentavos)}
                </td>
                <td className={`${tabelaMock.td} font-mono text-[11.5px]`}>
                  {dre.receitaCentavos > 0 ? "100%" : sem}
                </td>
                <td className={tabelaMock.td}>
                  <Barra
                    valor={dre.receitaCentavos > 0 ? 100 : 0}
                    rotulo="Receita sobre a receita"
                  />
                </td>
                <td className={`${tabelaMock.td} ${tabelaMock.sub}`}>
                  {plural(recebimentos, "recebimento", "recebimentos")}
                </td>
              </tr>
              {linhasDre.map((c) => {
                const pct = pctDaReceita(c.centavos);
                return (
                  <tr key={c.categoria} className={tabelaMock.tr}>
                    <td className={tabelaMock.td}>
                      {ROTULO_CATEGORIA[c.categoria]}
                    </td>
                    <td className={`${tabelaMock.td} font-mono text-[11.5px]`}>
                      {formatarMoeda(c.centavos)}
                    </td>
                    <td className={`${tabelaMock.td} font-mono text-[11.5px]`}>
                      {pct === null ? sem : formatarPct(pct)}
                    </td>
                    <td className={tabelaMock.td}>
                      <Barra
                        valor={pct ?? 0}
                        tom={
                          c.categoria === "equipe_assistencial"
                            ? "alerta"
                            : "aviso"
                        }
                        rotulo={`${ROTULO_CATEGORIA[c.categoria]} sobre a receita`}
                      />
                    </td>
                    <td className={`${tabelaMock.td} ${tabelaMock.sub}`}>
                      {plural(
                        contagemCategoria(c.categoria),
                        "lançamento",
                        "lançamentos",
                      )}
                    </td>
                  </tr>
                );
              })}
              <tr className={`${tabelaMock.tr} bg-creme-2`}>
                <td className={`${tabelaMock.td} ${tabelaMock.nome}`}>
                  Resultado
                </td>
                <td className={`${tabelaMock.td} font-mono text-[11.5px]`}>
                  <b>{formatarMoeda(dre.resultadoCentavos)}</b>
                </td>
                <td className={`${tabelaMock.td} font-mono text-[11.5px]`}>
                  <b>
                    {dre.margemPct === null ? sem : formatarPct(dre.margemPct)}
                  </b>
                </td>
                <td className={tabelaMock.td}>
                  <Barra
                    valor={dre.margemPct ?? 0}
                    tom={dre.resultadoCentavos < 0 ? "alerta" : "sucesso"}
                    rotulo="Resultado sobre a receita"
                  />
                </td>
                <td className={`${tabelaMock.td} ${tabelaMock.sub}`}>
                  Receita menos as despesas pagas
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </Card>

      <Nota>
        A soma dos lançamentos do mês é o resultado do DRE:{" "}
        {formatarMoeda(lancamentos.saldoCentavos)}.
      </Nota>

      <BlocoTabela
        id="fin-lanc"
        titulo={`Lançamentos de ${rotuloMes(lancamentos.mes)}`}
      >
        {lancamentos.lancamentos.length === 0 ? (
          <div className="p-4">
            <EstadoVazio
              nivelTitulo="h3"
              ilustracao={<MantaDobrada tamanho={96} />}
              titulo="Nenhum lançamento neste mês"
              texto="Os recebimentos aparecem sozinhos quando uma cobrança é paga. As despesas você lança na tela de despesas."
            />
          </div>
        ) : (
          <TabelaLista
            className={CLASSE_TABELA}
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
      </BlocoTabela>
    </div>
  );
}
