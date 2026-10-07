import Link from "next/link";
import type { ReactNode } from "react";
import { Colunas } from "@/components/graficos/colunas";
import {
  BarrasHorizontais as BarrasValor,
  Colunas as ColunasValor,
  Rosca,
} from "@/components/graficos";
import {
  Card,
  CardHead,
  Kpi,
  Nota,
  TituloSecao,
  tabelaMock,
} from "@/components/mockup";
import { FaixaAlerta } from "@/components/ui/faixa-alerta";
import { formatarMoeda } from "@/lib/formatacao";
import { formatarMoedaCurta, formatarPct, nomeMes } from "@/lib/gestao/formato";
import { somarMeses } from "@/lib/gestao/financeiro";
import {
  INDICADORES,
  progressoDasMetas,
  type SecaoPainel,
} from "@/lib/gestao/painel";
import { ROTULO_ORIGEM } from "@/modules/financeiro/gestao/textos";
import {
  FunilMock,
  HBarrasMock,
  LinhaMock,
  MiniLinhaMock,
  BarrasMock,
} from "@/modules/financeiro/graficos-mock";
import {
  CartaoGrafico,
  Grade,
  KpiLinha,
  SemDado,
  SeloPonto,
} from "@/modules/financeiro/mockup-ui";
import type { DadosPainel } from "../dados";
import {
  PERGUNTAS,
  avisoDaMeta,
  colunasDaCapacidade,
  contraAnterior,
  contraAnteriorPct,
  fraseDeExperiencia,
  fraseDeFinanceiro,
  frasesDeOperacao,
  textoDaMeta,
  textoDoCongelamento,
} from "../textos";

const semDado = "sem número";

const abreviar = (mes: string) => nomeMes(mes).slice(0, 3);

/** Texto do valor sem o sinal de porcentagem, para o `%` ir pequeno ao lado. */
const semPorcento = (n: number) => formatarPct(n).replace("%", "");

/**
 * Seção de detalhe de uma pergunta: título de seção do mockup, a frase que
 * responde antes dos números e, no fim, de onde vêm os números.
 */
function Secao({
  id,
  secao,
  frase,
  children,
}: {
  id: string;
  secao: SecaoPainel;
  frase: string;
  children: ReactNode;
}) {
  const indicadores = INDICADORES.filter((i) => i.secao === secao);
  return (
    <section aria-labelledby={id} className="flex flex-col gap-3.5">
      <div>
        <TituloSecao id={id} className="mb-1">
          {PERGUNTAS[secao]}
        </TituloSecao>
        <p className="text-tinta-70 max-w-[68ch] text-[13px] leading-[1.6]">
          {frase}
        </p>
      </div>
      {children}
      <details className="group">
        <summary className="text-tinta-70 min-h-toque inline-flex cursor-pointer list-none items-center text-[12.5px] font-semibold underline decoration-1 underline-offset-4 [&::-webkit-details-marker]:hidden">
          De onde vêm estes números
        </summary>
        <ul className="mt-2 flex flex-col gap-2">
          {indicadores.map((i) => (
            <li
              key={i.id}
              className="text-tinta-70 max-w-[68ch] text-[12.5px] leading-[1.6]"
            >
              <span className="text-tinta font-semibold">{i.rotulo}.</span>{" "}
              {i.definicao}
              {i.tela ? (
                <>
                  {" "}
                  <Link
                    href={i.tela.href}
                    className="text-tinta font-semibold underline decoration-1 underline-offset-4"
                  >
                    Ver em {i.tela.rotulo}
                  </Link>
                  .
                </>
              ) : null}
            </li>
          ))}
        </ul>
      </details>
    </section>
  );
}

/** Um número do painel: rótulo, valor e a comparação logo abaixo. */
function Numero({
  rotulo,
  valor,
  comparacao,
}: {
  rotulo: string;
  valor: string;
  comparacao?: string;
}) {
  return <Kpi rotulo={rotulo} valor={valor} delta={comparacao} />;
}

/** Divide dinheiro por contagem, em centavos inteiros; nulo sem divisor. */
const dividir = (centavos: number, n: number): number | null =>
  n > 0 ? Math.round(centavos / n) : null;

/**
 * Painel executivo (P52, PRD 16.2) no desenho do HTML de referência da
 * cliente (Indicadores): quatro indicadores, linha e funil, famílias, receita
 * por praça e metas, e a tabela das cinco perguntas. Abaixo, o detalhe de
 * cada pergunta. Todo número tem a consulta documentada
 * (docs/painel/consultas.md) e é o mesmo da tela de origem.
 */
export function PainelTela({ dados }: { dados: DadosPainel }) {
  const { atual: p, anterior: a } = dados;
  const mes = p.mes;
  const metas = progressoDasMetas(p.metas, p.progresso);
  const c = p.comercial;
  const m = p.marketing;
  const o = p.operacao;
  const e = p.experiencia;
  const f = p.financeiro;

  const regioes = [...new Set(o.capacidade.map((x) => x.regiao))].sort((x, y) =>
    x.localeCompare(y, "pt-BR"),
  );

  const cac = dividir(m.custoTotalCentavos, c.contratosAssinados);
  const cacAnterior = a
    ? dividir(a.marketing.custoTotalCentavos, a.comercial.contratosAssinados)
    : null;
  const meses = a
    ? [abreviar(somarMeses(mes, -1)), abreviar(mes)]
    : [abreviar(mes)];
  const dois = (atual: number, antes: number | undefined) =>
    a && antes !== undefined ? [antes, atual] : [atual];

  const sobrevenda = o.semanasEmSobrevenda;
  const situacaoOperacao =
    sobrevenda > 0
      ? {
          v: "alerta" as const,
          t: `${sobrevenda} ${sobrevenda === 1 ? "semana" : "semanas"} em sobrevenda`,
        }
      : o.semanasEmAtencao > 0
        ? {
            v: "aviso" as const,
            t: `${o.semanasEmAtencao} ${o.semanasEmAtencao === 1 ? "semana" : "semanas"} em atenção`,
          }
        : { v: "sucesso" as const, t: "Capacidade tranquila" };

  const perguntas: {
    bloco: string;
    responde: string;
    situacao: ReactNode;
  }[] = [
    {
      bloco: "Comercial",
      responde:
        "Quantos leads, sessões e contratos? Qual conversão e ticket médio?",
      situacao: (
        <SeloPonto variante={c.contratosAssinados > 0 ? "sucesso" : "neutro"}>
          {c.leads} {c.leads === 1 ? "lead" : "leads"} e {c.contratosAssinados}{" "}
          {c.contratosAssinados === 1 ? "contrato" : "contratos"}
        </SeloPonto>
      ),
    },
    {
      bloco: "Marketing",
      responde:
        "De onde vieram? Qual o custo por canal? Qual campanha gera receita, não apenas lead?",
      situacao: (
        <SeloPonto variante="neutro">
          Custo do mês {formatarMoeda(m.custoTotalCentavos)}
        </SeloPonto>
      ),
    },
    {
      bloco: "Operação",
      responde:
        "Quantas famílias ativas, quantas visitas, qual capacidade nas próximas semanas, quantas ocorrências?",
      situacao: (
        <SeloPonto variante={situacaoOperacao.v}>
          {situacaoOperacao.t}
        </SeloPonto>
      ),
    },
    {
      bloco: "Experiência",
      responde: "Satisfação, NPS, indicações geradas, depoimentos coletados",
      situacao:
        e.nps === null ? (
          <SeloPonto variante="neutro">NPS sem amostra</SeloPonto>
        ) : (
          <SeloPonto variante={e.nps >= p.metas.nps ? "sucesso" : "aviso"}>
            NPS {e.nps}
          </SeloPonto>
        ),
    },
    {
      bloco: "Financeiro",
      responde:
        "Receita, recebimentos, inadimplência, custos, margem por cliente, previsão",
      situacao:
        f.margemPct === null ? (
          <SeloPonto variante="neutro">Sem margem no mês</SeloPonto>
        ) : (
          <SeloPonto variante={f.resultadoCentavos >= 0 ? "sucesso" : "alerta"}>
            Margem {formatarPct(f.margemPct)}
          </SeloPonto>
        ),
    },
  ];

  return (
    <div className="flex flex-col gap-3.5">
      {o.semanasEmSobrevenda > 0 ? (
        <FaixaAlerta
          variante="prioritario"
          titulo={`${o.semanasEmSobrevenda} ${o.semanasEmSobrevenda === 1 ? "semana" : "semanas"} com chance de sobrevenda nas próximas ${o.capacidadeSemanas}`}
          acoes={
            <Link
              href="/capacidade"
              className="text-texto text-apoio font-semibold underline decoration-1 underline-offset-4"
            >
              Ver a capacidade
            </Link>
          }
        >
          Vale conversar sobre novos contratos nas regiões marcadas antes de
          fechar mais famílias.
        </FaixaAlerta>
      ) : null}

      <Grade colunas={4} data-tour="/painel:numeros">
        <KpiLinha
          rotulo="Leads no mês"
          valor={String(c.leads)}
          grafico={
            <MiniLinhaMock
              valores={dois(c.leads, a?.comercial.leads)}
              rotulo="Leads do mês anterior e deste mês"
            />
          }
          delta={contraAnterior(c.leads, a?.comercial.leads, mes)}
        />
        <KpiLinha
          rotulo="Conversão lead → contrato"
          valor={
            c.conversaoPct === null ? semDado : semPorcento(c.conversaoPct)
          }
          unidade={c.conversaoPct === null ? undefined : "%"}
          grafico={
            <MiniLinhaMock
              valores={
                a &&
                a.comercial.conversaoPct !== null &&
                c.conversaoPct !== null
                  ? [a.comercial.conversaoPct, c.conversaoPct]
                  : []
              }
              tom="sucesso"
              rotulo="Conversão do mês anterior e deste mês"
            />
          }
          delta={contraAnteriorPct(
            c.conversaoPct,
            a?.comercial.conversaoPct,
            mes,
          )}
        />
        <KpiLinha
          rotulo="Custo por cliente (CAC)"
          valor={cac === null ? semDado : formatarMoeda(cac)}
          grafico={
            <MiniLinhaMock
              valores={
                cac !== null && cacAnterior !== null ? [cacAnterior, cac] : []
              }
              tom="alerta"
              rotulo="Custo por cliente do mês anterior e deste mês"
            />
          }
          delta={
            cac === null
              ? "Sem contrato assinado para dividir o custo de marketing."
              : (contraAnterior(cac, cacAnterior, mes, formatarMoeda) ??
                "Custo de marketing dividido pelos contratos assinados.")
          }
        />
        <KpiLinha
          rotulo="Ciclo de venda"
          valor={semDado}
          grafico={<MiniLinhaMock valores={[]} rotulo="Ciclo de venda" />}
          delta="O sistema ainda não mede os dias entre o lead e o contrato."
        />
      </Grade>

      <Grade colunas={2}>
        <CartaoGrafico
          titulo="Leads, sessões e contratos"
          nota={a ? "mês anterior e mês atual" : "só este mês"}
        >
          <LinhaMock
            altura={200}
            rotulo="Leads, sessões realizadas e contratos assinados por mês"
            rotulos={meses}
            series={[
              {
                nome: "Leads",
                tom: "dourado2",
                area: true,
                valores: dois(c.leads, a?.comercial.leads),
              },
              {
                nome: "Sessões",
                tom: "dourado",
                valores: dois(
                  c.sessoesRealizadas,
                  a?.comercial.sessoesRealizadas,
                ),
              },
              {
                nome: "Contratos",
                tom: "sucesso",
                valores: dois(
                  c.contratosAssinados,
                  a?.comercial.contratosAssinados,
                ),
              },
            ]}
          />
        </CartaoGrafico>
        <CartaoGrafico
          titulo="Funil completo do mês"
          nota="do lead ao contrato"
        >
          {c.leads === 0 ? (
            <SemDado>
              Nenhum lead neste mês. Quando entrar o primeiro, o funil mostra
              quantos chegam a sessão e a contrato.
            </SemDado>
          ) : (
            <FunilMock
              rotulo="Funil do mês"
              etapas={[
                { rotulo: "Leads", valor: c.leads, tom: "areia" },
                {
                  rotulo: "Sessões realizadas",
                  valor: c.sessoesRealizadas,
                  tom: "dourado",
                },
                {
                  rotulo: "Contratos",
                  valor: c.contratosAssinados,
                  tom: "sucesso",
                },
              ]}
            />
          )}
        </CartaoGrafico>
      </Grade>

      <Grade colunas={3}>
        <CartaoGrafico titulo="Famílias atendidas" nota="começaram no mês">
          <BarrasMock
            altura={160}
            larguraInicial={340}
            rotulo="Famílias que começaram o acompanhamento, por mês"
            rotulos={meses}
            series={[
              {
                nome: "Famílias",
                tom: "dourado",
                valores: dois(
                  o.familiasIniciadas,
                  a?.operacao.familiasIniciadas,
                ),
              },
            ]}
          />
        </CartaoGrafico>
        <CartaoGrafico titulo="Receita por praça" nota="no mês">
          <SemDado>
            O sistema ainda não separa a receita por praça. A receita por origem
            da família está em Marketing e, mais abaixo, nos detalhes do mês.
          </SemDado>
        </CartaoGrafico>
        <CartaoGrafico titulo="As metas do mês" nota="realizado ÷ meta">
          <HBarrasMock
            formato="percentual"
            rotulo="Progresso de cada meta do mês, em porcentagem"
            linhas={metas.map((meta) => {
              const t = textoDaMeta(meta);
              return {
                rotulo: meta.rotulo,
                valor: Math.round((meta.fracao ?? 0) * 100),
                tom:
                  meta.fracao !== null && meta.fracao >= 1
                    ? "sucesso"
                    : "aviso",
                medidor: {
                  nome:
                    t.atualTexto === null
                      ? `${meta.rotulo}: ainda sem número, meta de ${t.metaTexto}`
                      : `${meta.rotulo}: ${t.atualTexto} de ${t.metaTexto}`,
                  agora:
                    meta.fracao === null ? null : Math.round(meta.fracao * 100),
                },
              };
            })}
          />
          <ul className="text-tinta-50 mt-2.5 flex flex-col gap-0.5 text-[11.5px]">
            {metas.map((meta) => {
              const t = textoDaMeta(meta);
              return (
                <li key={meta.chave}>
                  <span className="text-tinta font-semibold">
                    {meta.rotulo}:
                  </span>{" "}
                  {t.atualTexto === null
                    ? `meta de ${t.metaTexto}.`
                    : `${t.atualTexto} de ${t.metaTexto}.`}
                  {avisoDaMeta(meta, e.amostraMinima)
                    ? ` ${avisoDaMeta(meta, e.amostraMinima)}`
                    : ""}
                </li>
              );
            })}
          </ul>
        </CartaoGrafico>
      </Grade>

      {p.congelamento ? (
        <Nota>{textoDoCongelamento(p.congelamento)}</Nota>
      ) : null}

      <Card data-tour="/painel:perguntas">
        <CardHead titulo="As cinco perguntas do painel executivo" />
        <div className="overflow-x-auto">
          <table className={tabelaMock.tabela}>
            <caption className="sr-only">
              As cinco perguntas do painel e a situação de cada uma agora
            </caption>
            <thead>
              <tr>
                <th scope="col" className={`${tabelaMock.th} w-[120px]`}>
                  Bloco
                </th>
                <th scope="col" className={tabelaMock.th}>
                  O que o painel responde
                </th>
                <th scope="col" className={`${tabelaMock.th} w-[190px]`}>
                  Situação agora
                </th>
              </tr>
            </thead>
            <tbody>
              {perguntas.map((q) => (
                <tr key={q.bloco} className={tabelaMock.tr}>
                  <td className={`${tabelaMock.td} ${tabelaMock.nome}`}>
                    {q.bloco}
                  </td>
                  <td className={`${tabelaMock.td} ${tabelaMock.sub}`}>
                    {q.responde}
                  </td>
                  <td className={tabelaMock.td}>{q.situacao}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <TituloSecao>Detalhes do mês</TituloSecao>

      <Secao
        id="painel-comercial"
        secao="comercial"
        frase={
          c.leads === 0 && c.contratosAssinados === 0
            ? "Ainda não há lead nem contrato neste mês."
            : `${c.leads} ${c.leads === 1 ? "lead chegou" : "leads chegaram"}, ${c.sessoesRealizadas} ${c.sessoesRealizadas === 1 ? "sessão foi feita" : "sessões foram feitas"} e ${c.contratosAssinados} ${c.contratosAssinados === 1 ? "contrato foi assinado" : "contratos foram assinados"}.`
        }
      >
        <Grade colunas={3}>
          <Numero
            rotulo="Leads novos"
            valor={String(c.leads)}
            comparacao={contraAnterior(c.leads, a?.comercial.leads, mes)}
          />
          <Numero
            rotulo="Sessões realizadas"
            valor={String(c.sessoesRealizadas)}
            comparacao={contraAnterior(
              c.sessoesRealizadas,
              a?.comercial.sessoesRealizadas,
              mes,
            )}
          />
          <Numero
            rotulo="Contratos assinados"
            valor={String(c.contratosAssinados)}
            comparacao={contraAnterior(
              c.contratosAssinados,
              a?.comercial.contratosAssinados,
              mes,
            )}
          />
          <Numero
            rotulo="Conversão"
            valor={
              c.conversaoPct === null ? semDado : formatarPct(c.conversaoPct)
            }
            comparacao={contraAnteriorPct(
              c.conversaoPct,
              a?.comercial.conversaoPct,
              mes,
            )}
          />
          <Numero
            rotulo="Faturamento"
            valor={formatarMoeda(c.faturamentoCentavos)}
            comparacao={contraAnterior(
              c.faturamentoCentavos,
              a?.comercial.faturamentoCentavos,
              mes,
              formatarMoeda,
            )}
          />
          <Numero
            rotulo="Ticket médio"
            valor={
              c.ticketMedioCentavos === null
                ? semDado
                : formatarMoeda(c.ticketMedioCentavos)
            }
          />
        </Grade>
      </Secao>

      <Secao
        id="painel-marketing"
        secao="marketing"
        frase={
          m.leadsPorOrigem.length === 0
            ? "Ainda não há lead com origem neste mês."
            : `O canal que mais trouxe famílias foi ${ROTULO_ORIGEM[m.leadsPorOrigem[0]?.origem ?? "desconhecida"].toLowerCase()}, com ${m.leadsPorOrigem[0]?.leads} ${m.leadsPorOrigem[0]?.leads === 1 ? "lead" : "leads"}. O custo de marketing do mês foi ${formatarMoeda(m.custoTotalCentavos)}.`
        }
      >
        <Grade colunas={2}>
          <CartaoGrafico titulo="Leads por origem" nota="no mês">
            {m.leadsPorOrigem.length === 0 ? (
              <SemDado>Nenhum lead neste mês.</SemDado>
            ) : (
              <HBarrasMock
                rotulo="Leads do mês por origem"
                rotuloLargura={140}
                linhas={m.leadsPorOrigem.map((x) => ({
                  rotulo: ROTULO_ORIGEM[x.origem],
                  valor: x.leads,
                  tom: "dourado",
                  nota: String(x.leads),
                }))}
              />
            )}
          </CartaoGrafico>
          <CartaoGrafico titulo="Custo por canal" nota="no mês">
            {m.custoPorCanal.length === 0 ? (
              <SemDado>
                Nenhum gasto de marketing lançado neste mês. Lance as despesas
                de anúncios, com o canal, em{" "}
                <Link
                  href="/financeiro/despesas"
                  className="text-tinta font-semibold underline decoration-1 underline-offset-4"
                >
                  Despesas
                </Link>
                .
              </SemDado>
            ) : (
              <HBarrasMock
                rotulo="Custo de marketing do mês por canal"
                rotuloLargura={140}
                direita={78}
                linhas={m.custoPorCanal.map((x) => ({
                  rotulo: x.canal
                    ? ROTULO_ORIGEM[x.canal]
                    : "Sem canal informado",
                  valor: x.centavos,
                  tom: "aviso",
                  nota: formatarMoedaCurta(x.centavos),
                }))}
              />
            )}
          </CartaoGrafico>
          <CartaoGrafico titulo="Receita por origem" nota="no mês">
            {m.receitaPorOrigem.length === 0 ? (
              <SemDado>Nenhum pagamento recebido neste mês.</SemDado>
            ) : (
              <HBarrasMock
                rotulo="Receita do mês por origem da família"
                rotuloLargura={140}
                direita={78}
                linhas={m.receitaPorOrigem.map((x) => ({
                  rotulo: ROTULO_ORIGEM[x.origem],
                  valor: x.centavos,
                  tom: "sucesso",
                  nota: formatarMoedaCurta(x.centavos),
                }))}
              />
            )}
          </CartaoGrafico>
          <CartaoGrafico titulo="Receita por campanha" nota="no mês">
            {m.receitaPorCampanha.length === 0 ? (
              <SemDado>
                Nenhuma campanha com código de origem recebeu neste mês. As
                campanhas aparecem quando os links de WhatsApp por canal, com o
                código de origem, estiverem em uso.
              </SemDado>
            ) : (
              <HBarrasMock
                rotulo="Receita do mês por campanha"
                rotuloLargura={140}
                direita={78}
                linhas={m.receitaPorCampanha.map((x) => ({
                  rotulo: x.campanha,
                  valor: x.centavos,
                  tom: "dourado",
                  nota: formatarMoedaCurta(x.centavos),
                }))}
              />
            )}
          </CartaoGrafico>
        </Grade>
      </Secao>

      <Secao id="painel-operacao" secao="operacao" frase={frasesDeOperacao(p)}>
        <Grade colunas={4}>
          <Numero rotulo="Famílias ativas" valor={String(o.familiasAtivas)} />
          <Numero
            rotulo="Famílias que começaram no mês"
            valor={String(o.familiasIniciadas)}
            comparacao={contraAnterior(
              o.familiasIniciadas,
              a?.operacao.familiasIniciadas,
              mes,
            )}
          />
          <Numero
            rotulo="Visitas realizadas"
            valor={String(o.visitasRealizadas)}
            comparacao={contraAnterior(
              o.visitasRealizadas,
              a?.operacao.visitasRealizadas,
              mes,
            )}
          />
          <Numero
            rotulo="Ocorrências abertas"
            valor={String(o.ocorrenciasAbertas)}
          />
        </Grade>
        <CartaoGrafico
          titulo={`Capacidade das próximas ${o.capacidadeSemanas} semanas`}
          nota="ocupação por região"
        >
          <div className="flex flex-col gap-4">
            {regioes.map((regiao) => (
              <div key={regiao} className="flex flex-col gap-1">
                <p className="text-[12.5px] font-semibold">{regiao}</p>
                <Colunas
                  descricao={`Ocupação de ${regiao} nas próximas ${o.capacidadeSemanas} semanas`}
                  dados={colunasDaCapacidade(
                    o.capacidade.filter((x) => x.regiao === regiao),
                  )}
                  eixo="porcentagem"
                  legenda={
                    regiao === regioes[regioes.length - 1]
                      ? [
                          { estado: "neutro", rotulo: "Tranquila" },
                          { estado: "atencao", rotulo: "Atenção" },
                          { estado: "alerta", rotulo: "Sobrevenda provável" },
                        ]
                      : undefined
                  }
                />
              </div>
            ))}
            <Link
              href="/capacidade"
              className="text-tinta min-h-toque inline-flex items-center self-start text-[12.5px] font-semibold underline decoration-1 underline-offset-4"
            >
              Ver a capacidade com a tabela e o backup
            </Link>
          </div>
        </CartaoGrafico>
      </Secao>

      <Secao
        id="painel-experiencia"
        secao="experiencia"
        frase={fraseDeExperiencia(p)}
      >
        <Grade colunas={2}>
          <CartaoGrafico titulo="NPS do mês" nota={`meta de ${p.metas.nps}`}>
            <div className="mb-3 flex flex-wrap items-baseline gap-x-3 gap-y-1">
              <span className="font-titulo text-[33px] leading-[1.1] font-light tracking-[-0.02em] tabular-nums">
                {e.nps === null ? semDado : e.nps}
              </span>
              {e.nps !== null && a?.experiencia.nps != null ? (
                <span className="text-tinta-50 text-[11.5px]">
                  {contraAnterior(e.nps, a.experiencia.nps, mes)}
                </span>
              ) : null}
            </div>
            {e.nps === null ? (
              <SemDado>
                Com menos de {e.amostraMinima} respostas o NPS não aparece, para
                não enganar. {e.respostas} de {e.amostraMinima} até agora. A
                nota e o gráfico surgem quando a pesquisa chegar lá.
              </SemDado>
            ) : (
              <BarrasValor
                rotulo="NPS contra a meta e o mês anterior"
                larguraRotulo="8.5rem"
                itens={[
                  {
                    rotulo: "Este mês",
                    valor: Math.max(e.nps, 0),
                    tom: "dourado",
                    nota: String(e.nps),
                    dica: `NPS de ${e.nps} em ${nomeMes(mes)}`,
                  },
                  ...(a?.experiencia.nps != null
                    ? [
                        {
                          rotulo: nomeMes(somarMeses(mes, -1)),
                          valor: Math.max(a.experiencia.nps, 0),
                          tom: "areia" as const,
                          nota: String(a.experiencia.nps),
                          dica: `NPS de ${a.experiencia.nps} no mês anterior`,
                        },
                      ]
                    : []),
                  {
                    rotulo: "Meta",
                    valor: p.metas.nps,
                    tom: "marinho",
                    nota: String(p.metas.nps),
                    dica: `Meta de NPS: ${p.metas.nps}`,
                  },
                ]}
              />
            )}
          </CartaoGrafico>
          <CartaoGrafico titulo="Quem respondeu" nota="no mês">
            {e.nps === null ? (
              <SemDado>
                A divisão entre promotores, neutros e detratores aparece junto
                com o NPS, a partir de {e.amostraMinima} respostas no mês.
              </SemDado>
            ) : (
              <Rosca
                rotulo="Respostas do mês por tipo"
                centro={{ valor: String(e.respostas), legenda: "respostas" }}
                fatias={[
                  { rotulo: "Promotores", valor: e.promotores, tom: "sucesso" },
                  {
                    rotulo: "Neutros",
                    valor: Math.max(
                      e.respostas - e.promotores - e.detratores,
                      0,
                    ),
                    tom: "areia",
                  },
                  { rotulo: "Detratores", valor: e.detratores, tom: "aviso" },
                ]}
              />
            )}
          </CartaoGrafico>
        </Grade>
        <CartaoGrafico
          titulo="NPS mês a mês"
          nota="promotores menos detratores"
        >
          {dados.npsMensal ? (
            <>
              <ColunasValor
                rotulo="NPS por mês"
                tom="dourado"
                tomReferencia="marinho"
                referencia={{ valor: p.metas.nps, rotulo: "Meta" }}
                itens={dados.npsMensal.meses.map((x) => ({
                  rotulo: nomeMes(x.mes).slice(0, 3),
                  valor: x.nps ?? 0,
                  valorTexto: x.nps === null ? "sem amostra" : undefined,
                  dica:
                    x.nps === null
                      ? [
                          `${nomeMes(x.mes)}: sem amostra`,
                          `${x.respostas} de ${dados.npsMensal!.amostraMinima} respostas`,
                        ]
                      : [
                          `${nomeMes(x.mes)}: NPS ${x.nps}`,
                          `${x.respostas} respostas`,
                          `${x.promotores} promotores e ${x.detratores} detratores`,
                        ],
                }))}
              />
              <p className="text-tinta-50 mt-3 max-w-[60ch] text-[11.5px] leading-[1.6]">
                Mesma conta do NPS do mês: promotores menos detratores. O mês só
                ganha número a partir de {dados.npsMensal.amostraMinima}{" "}
                respostas, para uma porcentagem sobre poucas famílias não
                enganar.
              </p>
            </>
          ) : (
            <SemDado>
              Não foi possível ler as respostas da pesquisa agora. Recarregue a
              página; nada foi alterado.
            </SemDado>
          )}
        </CartaoGrafico>
        <Grade colunas={3}>
          <Numero
            rotulo="Respostas da pesquisa"
            valor={String(e.respostas)}
            comparacao={contraAnterior(
              e.respostas,
              a?.experiencia.respostas,
              mes,
            )}
          />
          <Numero
            rotulo="Indicações"
            valor={String(e.indicacoes)}
            comparacao={contraAnterior(
              e.indicacoes,
              a?.experiencia.indicacoes,
              mes,
            )}
          />
          <Numero
            rotulo="Depoimentos autorizados"
            valor={String(e.depoimentos)}
          />
        </Grade>
      </Secao>

      <Secao
        id="painel-financeiro"
        secao="financeiro"
        frase={fraseDeFinanceiro(p)}
      >
        <Grade colunas={2}>
          <CartaoGrafico
            titulo="Este mês contra o anterior e a meta"
            nota="em reais"
          >
            <ColunasValor
              formato="moeda"
              maxValoresNoTopo={6}
              tomReferencia="marinho"
              rotulo="Faturamento, recebido e custos, em reais"
              tom="areia"
              tom2="dourado"
              legenda={
                a ? [nomeMes(somarMeses(mes, -1)), nomeMes(mes)] : undefined
              }
              referencia={{
                valor: p.metas.faturamentoMesCentavos,
                rotulo: "Meta de faturamento",
              }}
              itens={[
                {
                  rotulo: "Faturamento",
                  valor: a
                    ? a.financeiro.faturamentoCentavos
                    : f.faturamentoCentavos,
                  valor2: a ? f.faturamentoCentavos : undefined,
                  dica: [
                    "Faturamento (contratos assinados)",
                    `Este mês: ${formatarMoeda(f.faturamentoCentavos)}`,
                    `Meta: ${formatarMoeda(p.metas.faturamentoMesCentavos)}`,
                  ],
                },
                {
                  rotulo: "Recebido",
                  valor: a
                    ? a.financeiro.recebimentosCentavos
                    : f.recebimentosCentavos,
                  valor2: a ? f.recebimentosCentavos : undefined,
                  dica: [
                    "Recebido (cobranças pagas)",
                    `Este mês: ${formatarMoeda(f.recebimentosCentavos)}`,
                  ],
                },
                {
                  rotulo: "Custos",
                  valor: a ? a.financeiro.custosCentavos : f.custosCentavos,
                  valor2: a ? f.custosCentavos : undefined,
                  dica: [
                    "Custos (despesas pagas)",
                    `Este mês: ${formatarMoeda(f.custosCentavos)}`,
                  ],
                },
              ]}
            />
            {a ? null : (
              <p className="text-tinta-50 mt-3 text-[11.5px]">
                Sem mês anterior para comparar. As colunas mostram só este mês.
              </p>
            )}
          </CartaoGrafico>
          <CartaoGrafico
            titulo="Receita, recebido, a receber e despesas"
            nota="no mês"
          >
            <HBarrasMock
              rotulo="Dinheiro do mês em reais"
              rotuloLargura={128}
              direita={78}
              linhas={[
                {
                  rotulo: "Faturamento",
                  valor: f.faturamentoCentavos,
                  tom: "marinho",
                  nota: formatarMoedaCurta(f.faturamentoCentavos),
                },
                {
                  rotulo: "Recebido",
                  valor: f.recebimentosCentavos,
                  tom: "sucesso",
                  nota: formatarMoedaCurta(f.recebimentosCentavos),
                },
                {
                  rotulo: "A receber",
                  valor: f.previsaoAVencerCentavos,
                  tom: "dourado",
                  nota: formatarMoedaCurta(f.previsaoAVencerCentavos),
                },
                {
                  rotulo: "Vencido em aberto",
                  valor: f.vencidoCentavos,
                  tom: "aviso",
                  nota: formatarMoedaCurta(f.vencidoCentavos),
                },
                {
                  rotulo: "Despesas",
                  valor: f.custosCentavos,
                  tom: "areia",
                  nota: formatarMoedaCurta(f.custosCentavos),
                },
              ]}
            />
          </CartaoGrafico>
        </Grade>
        <Grade colunas={3}>
          <Numero
            rotulo="Recebimentos"
            valor={formatarMoeda(f.recebimentosCentavos)}
            comparacao={contraAnterior(
              f.recebimentosCentavos,
              a?.financeiro.recebimentosCentavos,
              mes,
              formatarMoeda,
            )}
          />
          <Numero
            rotulo="Custos"
            valor={formatarMoeda(f.custosCentavos)}
            comparacao={contraAnterior(
              f.custosCentavos,
              a?.financeiro.custosCentavos,
              mes,
              formatarMoeda,
            )}
          />
          <Numero
            rotulo="Resultado"
            valor={formatarMoeda(f.resultadoCentavos)}
            comparacao={contraAnterior(
              f.resultadoCentavos,
              a?.financeiro.resultadoCentavos,
              mes,
              formatarMoeda,
            )}
          />
          <Numero
            rotulo="Margem"
            valor={f.margemPct === null ? semDado : formatarPct(f.margemPct)}
            comparacao={contraAnteriorPct(
              f.margemPct,
              a?.financeiro.margemPct,
              mes,
            )}
          />
          <Numero
            rotulo="Inadimplência"
            valor={
              f.inadimplenciaPct === null
                ? semDado
                : formatarPct(f.inadimplenciaPct)
            }
            comparacao={
              f.vencidoCentavos > 0
                ? `${formatarMoeda(f.vencidoCentavos)} vencidos e em aberto.`
                : "Nada vencido em aberto."
            }
          />
          <Numero
            rotulo="A receber nos próximos meses"
            valor={formatarMoeda(f.previsaoAVencerCentavos)}
            comparacao={
              f.previsaoAtrasadasCentavos > 0
                ? `Mais ${formatarMoeda(f.previsaoAtrasadasCentavos)} já venceram.`
                : undefined
            }
          />
          <Numero
            rotulo="Faturamento do mês"
            valor={formatarMoeda(f.faturamentoCentavos)}
            comparacao="Contratos assinados no mês."
          />
        </Grade>
        <Link
          href="/financeiro"
          className="text-tinta min-h-toque inline-flex items-center self-start text-[12.5px] font-semibold underline decoration-1 underline-offset-4"
        >
          Ver o DRE, as despesas e a previsão
        </Link>
      </Secao>
    </div>
  );
}
