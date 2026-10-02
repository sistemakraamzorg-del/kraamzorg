import Link from "next/link";
import {
  BarChart3,
  MapPin,
  MessagesSquare,
  Radar,
  Siren,
  Users,
} from "lucide-react";
import { saudacao } from "@/components/shell/saudacao";
import { BlocoAba } from "@/components/ui/bloco-aba";
import { Selo } from "@/components/ui/selo";
import {
  hojeEmBrasilia,
  horaCurta,
  inicioDaSemana,
  somarDias,
} from "@/lib/agenda/datas";
import type { SessaoUsuario } from "@/lib/auth/tipos";
import { obterRepositorios } from "@/lib/dados/fabrica";
import type { AlertaClinicoResumo } from "@/lib/dados/tipos-assistencial";
import type { AgendaPeriodo, EquipeVisao } from "@/lib/dados/tipos-equipe";
import type { Radar as RadarDados } from "@/lib/dados/tipos-operacao";
import type { CapacidadeVisao } from "@/lib/dados/tipos-gestao";
import type { SessaoVenda } from "@/lib/dados/tipos-venda";
import { formatarDiaSemanaEData, formatarMoeda } from "@/lib/formatacao";
import { dataCurta, formatarPct } from "@/lib/gestao/formato";
import type { TomGrafico } from "@/components/graficos";
import {
  familiasPorGrupo,
  ocupacaoPorSemana,
  ROTULO_GRUPO,
  visitasPorDia,
  type GrupoFamilia,
} from "@/modules/inicio/derivados";
import {
  AnelMeta,
  BarrasHorizontais,
  Colunas,
  FaixaDoDia,
  GradeGraficos,
  GradeIndicadores,
  PainelGrafico,
  Rosca,
  Sparkline,
  type Indicador,
} from "@/modules/inicio/painel-gestao";
import type { Dre } from "@/lib/dados/tipos-gestao";
import { ROTULO_ESTADO_SENSIVEL } from "@/modules/crm/ficha/rotulos";
import { quandoSessao, separarAgenda } from "@/modules/crm/sessao-venda/agenda";
import { obterTelaCapacidade } from "@/modules/operacao/capacidade/dados";
import {
  fraseResumo,
  ROTULO_NIVEL,
  tituloDoAlerta,
} from "@/modules/operacao/capacidade/textos";
import { fraseSinteseEquipe } from "@/modules/operacao/equipe/textos";
import { obterTelaPainel, type DadosPainel } from "@/modules/painel/dados";
import { contraAnterior, fraseDoPainel } from "@/modules/painel/textos";
import {
  alertasEmOrdem,
  contextoFichas,
  contextoOfertas,
  contextoVisitasHoje,
  fichasSemAssinatura,
  fraseAlertas,
  fraseRadar,
  fraseSessoes,
  linhaDaEnfermeira,
  linhaNasceu,
  linhaRadar,
  radarDaSemana,
  ROTULO_SEVERIDADE,
  visitasPorEnfermeira,
  visitasQueContam,
  type VisitasDaEnfermeira,
} from "./textos-gestao";

/**
 * Início da coordenação e da diretoria [polimento] (fluxo C; DESIGN.md
 * 2.13 e 11.4), no mesmo padrão do Início do comercial e do Hoje da
 * enfermeira: o bloco do dia com o cumprimento em aba, o trio de números
 * (um em marinho, dois em tom médio) e, embaixo, os blocos com aba de cada
 * assunto. Só leituras que já existem; cada uma falha sozinha, sem derrubar
 * o Início (o bloco diz que não carregou).
 *
 * Tons por tela (no máximo quatro): dourado no bloco do dia, marinho no
 * número principal, argila para pessoas e conversas, lavanda para o tempo.
 * Alertas clínicos ficam no bloco neutro, sem tom de apoio (PRD 20.2
 * [v4.4], regra 3).
 */

async function tentar<T>(ler: () => Promise<T>): Promise<T | null> {
  try {
    return await ler();
  } catch {
    return null;
  }
}

interface DadosDoDia {
  hoje: string;
  equipe: EquipeVisao | null;
  semana: AgendaPeriodo | null;
  alertas: AlertaClinicoResumo[] | null;
}

async function lerDoDia(): Promise<DadosDoDia> {
  const repos = await obterRepositorios();
  const hoje = hojeEmBrasilia();
  const segunda = inicioDaSemana(hoje);
  const [equipe, semana, alertas] = await Promise.all([
    tentar(() => repos.equipe.obterEquipe({ dia: hoje })),
    tentar(() =>
      repos.equipe.obterAgenda({ desde: segunda, ate: somarDias(segunda, 6) }),
    ),
    tentar(() => repos.assistencial.listarAlertas("abertos")),
  ]);
  return { hoje, equipe, semana, alertas };
}

const DIAS_CURTOS = ["seg", "ter", "qua", "qui", "sex", "sáb", "dom"];

const TOM_GRUPO: Record<GrupoFamilia, TomGrafico> = {
  negociacao: "areia",
  contratada: "dourado",
  espera: "aviso",
  atendimento: "sucesso",
  outras: "marinho",
};

export async function InicioCoordenacao({ sessao }: { sessao: SessaoUsuario }) {
  const repos = await obterRepositorios();
  const [dia, radar, sessoes, capacidade] = await Promise.all([
    lerDoDia(),
    tentar(() => repos.operacao.radar(null)),
    tentar(() => repos.venda.listarSessoes()),
    tentar(() => obterTelaCapacidade(sessao)),
  ]);
  const porEnfermeira = dia.semana
    ? visitasPorEnfermeira(dia.semana.visitas, dia.hoje)
    : [];
  const visao = capacidade?.situacao === "ok" ? capacidade.visao : null;

  return (
    <>
      <FaixaDoDia
        saudacao={saudacao(sessao.nome)}
        titulo={formatarDiaSemanaEData(new Date()) ?? "Início"}
        frase={
          dia.equipe
            ? `Equipe agora: ${fraseSinteseEquipe(dia.equipe.resumo)}`
            : undefined
        }
      />
      <Decisao>
        <BlocoAlertas alertas={dia.alertas} />
        <BlocoCapacidade visao={visao} />
      </Decisao>
      <GradeIndicadores
        itens={indicadoresDoDia({
          dia,
          porEnfermeira,
          radar,
          mostrarOfertas: true,
        })}
      />
      <GradeGraficos>
        <GraficoVisitasEnfermeira
          porEnfermeira={dia.semana ? porEnfermeira : null}
          limite={dia.semana?.limiteVisitasDia ?? null}
        />
        <GraficoCapacidade visao={visao} />
        <GraficoFamilias radar={radar} />
      </GradeGraficos>
      <GradeGraficos colunas={2}>
        <GraficoRegioes visao={visao} />
        <GraficoVisitasDia semana={dia.semana} hoje={dia.hoje} />
      </GradeGraficos>
      <div className="grid grid-cols-1 gap-6 pt-8 lg:grid-cols-2">
        <BlocoVisitasHoje
          porEnfermeira={dia.semana ? porEnfermeira : null}
          limite={dia.semana?.limiteVisitasDia ?? null}
        />
        <BlocoRadar radar={radar} hoje={dia.hoje} />
        <BlocoSessoes sessoes={sessoes} />
      </div>
    </>
  );
}

export async function InicioDiretoria({ sessao }: { sessao: SessaoUsuario }) {
  const repos = await obterRepositorios();
  const [dia, painel, capacidade, radar, dre] = await Promise.all([
    lerDoDia(),
    tentar(() => obterTelaPainel(sessao, null)),
    tentar(() => obterTelaCapacidade(sessao)),
    tentar(() => repos.operacao.radar(null)),
    tentar(() => repos.gestao.dre(null)),
  ]);
  const porEnfermeira = dia.semana
    ? visitasPorEnfermeira(dia.semana.visitas, dia.hoje)
    : [];
  const dadosPainel = painel?.situacao === "ok" ? painel.dados : null;
  const visao = capacidade?.situacao === "ok" ? capacidade.visao : null;

  return (
    <>
      <FaixaDoDia
        saudacao={saudacao(sessao.nome)}
        titulo={formatarDiaSemanaEData(new Date()) ?? "Início"}
        frase={
          dadosPainel
            ? fraseDoPainel(dadosPainel.atual)
            : dia.equipe
              ? `Equipe agora: ${fraseSinteseEquipe(dia.equipe.resumo)}`
              : undefined
        }
      />
      <Decisao>
        <BlocoAlertas alertas={dia.alertas} />
        <BlocoCapacidade visao={visao} />
      </Decisao>
      <GradeIndicadores
        itens={
          dadosPainel
            ? indicadoresDoMes({
                dia,
                porEnfermeira,
                radar,
                dados: dadosPainel,
                dre,
              })
            : indicadoresDoDia({
                dia,
                porEnfermeira,
                radar,
                mostrarOfertas: true,
              })
        }
      />
      <GradeGraficos>
        <GraficoFunil dados={dadosPainel} />
        <GraficoCapacidade visao={visao} />
        <GraficoFamilias radar={radar} />
      </GradeGraficos>
      <GradeGraficos colunas={2}>
        <GraficoRegioes visao={visao} />
        <GraficoMeta dados={dadosPainel} />
      </GradeGraficos>
      <div className="grid grid-cols-1 gap-6 pt-8 lg:grid-cols-2">
        <BlocoVisitasHoje
          porEnfermeira={dia.semana ? porEnfermeira : null}
          limite={dia.semana?.limiteVisitasDia ?? null}
        />
        <BlocoPainel mostrarMes={Boolean(dadosPainel)} />
      </div>
    </>
  );
}

/** Primeiro o que exige decisão: alertas clínicos e capacidade (sobrevenda). */
function Decisao({ children }: { children: React.ReactNode }) {
  return (
    <section
      aria-label="O que pede decisão agora"
      className="grid grid-cols-1 gap-4 pt-6 lg:grid-cols-2"
    >
      {children}
    </section>
  );
}

// --- Indicadores -------------------------------------------------------------------

function plural(n: number, um: string, varios: string): string {
  return `${n} ${n === 1 ? um : varios}`;
}

interface EntradaIndicadores {
  dia: DadosDoDia;
  porEnfermeira: VisitasDaEnfermeira[];
  radar: RadarDados | null;
  mostrarOfertas?: boolean;
}

/** Visitas hoje, com o ritmo da semana no mini gráfico (agenda real). */
function indicadorVisitas({
  dia,
  porEnfermeira,
}: EntradaIndicadores): Indicador | null {
  if (!dia.semana) return null;
  const contam = visitasQueContam(dia.semana.visitas);
  const hoje = contam.filter((v) => v.data === dia.hoje).length;
  return {
    rotulo: hoje === 1 ? "Visita hoje" : "Visitas hoje",
    valor: hoje,
    contexto: contextoVisitasHoje(porEnfermeira),
    href: "#inicio-visitas",
    tom: "lavanda",
    serie: visitasPorDia(contam, inicioDaSemana(dia.hoje)).map((d) => d.total),
    rotuloSerie: "Visitas em cada dia da semana",
    tomGrafico: "dourado",
  };
}

function indicadorNascimento(radar: RadarDados | null): Indicador | null {
  if (!radar) return null;
  const esperando = radar.familias.filter(
    (f) => f.estagioP2 === "aguardando_nascimento",
  );
  const semConfirmar = esperando.filter((f) => f.dppSemConfirmacao).length;
  return {
    rotulo: "Aguardando nascimento",
    valor: esperando.length,
    contexto:
      semConfirmar > 0
        ? `${plural(semConfirmar, "família", "famílias")} sem confirmação`
        : "todas dentro do esperado",
    href: "/radar",
    tom: "salvia",
  };
}

function indicadoresDoDia(e: EntradaIndicadores): Indicador[] {
  const fichas = e.dia.semana
    ? fichasSemAssinatura(e.dia.semana.visitas)
    : null;
  const ofertas = e.dia.equipe?.resumo.ofertaPendente ?? null;
  const itens: (Indicador | null)[] = [
    indicadorVisitas(e),
    fichas
      ? {
          rotulo:
            fichas.length === 1
              ? "Ficha sem assinatura"
              : "Fichas sem assinatura",
          valor: fichas.length,
          contexto: contextoFichas(fichas.length),
          href: "/agenda",
          tom: "argila",
        }
      : null,
    indicadorNascimento(e.radar),
    ofertas !== null
      ? {
          rotulo:
            ofertas === 1 ? "Oferta sem resposta" : "Ofertas sem resposta",
          valor: ofertas,
          contexto: contextoOfertas(
            ofertas,
            e.dia.equipe?.resumo.ofertaMaisAntigaHoras ?? null,
          ),
          href: "/equipe",
          tom: "dourado",
        }
      : null,
  ];
  return itens.filter((i): i is Indicador => i !== null);
}

/** A frase de comparação vira contexto do cartão: minúscula, sem ponto. */
function emContexto(frase: string): string {
  const sem = frase.replace(/\.$/, "");
  // Só baixa a primeira letra de palavra comum: "R$ 4.550" não vira "r$ 4.550".
  return /^[A-ZÀ-Ý][a-zà-ÿ]/.test(sem)
    ? sem.charAt(0).toLowerCase() + sem.slice(1)
    : sem;
}

function indicadoresDoMes(
  e: EntradaIndicadores & { dados: DadosPainel; dre: Dre | null },
): Indicador[] {
  const { atual, anterior } = e.dados;
  const o = atual.operacao;
  const receita = atual.financeiro.recebimentosCentavos;
  const comparacao = contraAnterior(
    receita,
    anterior?.financeiro.recebimentosCentavos,
    atual.mes,
    formatarMoeda,
  );
  const serieReceita = e.dre?.serie.map((p) => p.receitaCentavos / 100) ?? [];
  const itens: (Indicador | null)[] = [
    {
      rotulo:
        o.familiasAtivas === 1
          ? "Família em atendimento"
          : "Famílias em atendimento",
      valor: o.familiasAtivas,
      contexto:
        o.familiasIniciadas === 1
          ? "1 começou no mês"
          : `${o.familiasIniciadas} começaram no mês`,
      href: "/equipe",
      tom: "argila",
    },
    indicadorVisitas(e),
    indicadorNascimento(e.radar),
    {
      rotulo: "Recebido no mês",
      valor: formatarMoeda(receita),
      contexto: comparacao
        ? emContexto(comparacao)
        : "sem mês anterior para comparar",
      href: "/painel",
      tom: "dourado",
      serie: serieReceita.length > 1 ? serieReceita : undefined,
      rotuloSerie: "Recebimentos dos últimos meses",
      tomGrafico: "sucesso",
    },
  ];
  return itens.filter((i): i is Indicador => i !== null);
}

// --- Gráficos ------------------------------------------------------------------------

const VAZIO_GENTIL =
  "Ainda sem dados suficientes por aqui. Assim que houver, o gráfico aparece.";

function GraficoFunil({ dados }: { dados: DadosPainel | null }) {
  const c = dados?.atual.comercial;
  return (
    <PainelGrafico
      titulo="Funil do mês"
      nota="de lead a contrato assinado"
      leitura="Barras maiores são etapas com mais famílias; compare uma etapa com a seguinte."
      vazio={
        c
          ? undefined
          : "Os números de venda pedem a verificação em duas etapas. Abra o painel executivo para confirmar."
      }
    >
      {c ? (
        <BarrasHorizontais
          rotulo="Funil do mês"
          larguraRotulo="6.5rem"
          itens={[
            { rotulo: "Leads", valor: c.leads, tom: "dourado" },
            { rotulo: "Sessões", valor: c.sessoesRealizadas, tom: "aviso" },
            {
              rotulo: "Contratos",
              valor: c.contratosAssinados,
              tom: "sucesso",
            },
          ]}
        />
      ) : null}
    </PainelGrafico>
  );
}

function GraficoVisitasEnfermeira({
  porEnfermeira,
  limite,
}: {
  porEnfermeira: VisitasDaEnfermeira[] | null;
  limite: number | null;
}) {
  const vazio =
    porEnfermeira === null
      ? "A agenda de hoje não carregou agora. Nada se perdeu: recarregue a página."
      : porEnfermeira.length === 0
        ? "Nenhuma visita marcada para hoje. Um dia mais calmo para a equipe."
        : undefined;
  return (
    <PainelGrafico
      titulo="Visitas por enfermeira"
      nota={limite ? `hoje, limite de ${limite} por dia` : "hoje"}
      leitura="Barra em tom de aviso: a enfermeira chegou ao limite do dia."
      vazio={vazio}
    >
      {porEnfermeira ? (
        <BarrasHorizontais
          rotulo="Visitas de hoje por enfermeira"
          larguraRotulo="6.5rem"
          itens={porEnfermeira.map((e) => ({
            rotulo: e.nome.split(" ")[0] ?? e.nome,
            valor: e.visitas.length,
            tom: limite && e.visitas.length >= limite ? "aviso" : "dourado",
          }))}
        />
      ) : null}
    </PainelGrafico>
  );
}

function GraficoCapacidade({ visao }: { visao: CapacidadeVisao | null }) {
  const semanas = visao ? ocupacaoPorSemana(visao) : [];
  return (
    <PainelGrafico
      titulo="Capacidade por semana"
      nota={
        visao
          ? `maior ocupação entre as regiões, atenção a partir de ${formatarPct(visao.limites.alertaPct)}`
          : undefined
      }
      leitura="Cada coluna é uma semana; a linha de referência marca o limite de atenção."
      vazio={semanas.length === 0 ? VAZIO_GENTIL : undefined}
    >
      {semanas.length > 0 ? (
        <Colunas
          rotulo="Ocupação por semana, em porcentagem"
          itens={semanas.map((s) => ({
            rotulo: dataCurta(s.semana),
            valor: s.ocupacaoPct,
          }))}
        />
      ) : null}
    </PainelGrafico>
  );
}

function GraficoFamilias({ radar }: { radar: RadarDados | null }) {
  const grupos = radar ? familiasPorGrupo(radar.familias) : null;
  const total = radar ? radar.familias.length : 0;
  return (
    <PainelGrafico
      titulo="Onde estão as famílias"
      nota={
        radar ? `${plural(total, "família", "famílias")} no radar` : undefined
      }
      vazio={total === 0 ? VAZIO_GENTIL : undefined}
    >
      {grupos ? (
        <Rosca
          rotulo="Famílias por situação"
          centro={{ valor: String(total), legenda: "famílias" }}
          fatias={(Object.keys(grupos) as GrupoFamilia[])
            .filter((g) => grupos[g] > 0)
            .map((g) => ({
              rotulo: ROTULO_GRUPO[g],
              valor: grupos[g],
              tom: TOM_GRUPO[g],
            }))}
        />
      ) : null}
    </PainelGrafico>
  );
}

function GraficoRegioes({ visao }: { visao: CapacidadeVisao | null }) {
  const semana = visao ? ocupacaoPorSemana(visao, 1)[0]?.semana : undefined;
  const itens =
    visao && semana
      ? visao.regioes.flatMap((r) => {
          const s = r.semanas.find((x) => x.semana === semana);
          return s
            ? [
                {
                  rotulo: r.regiao,
                  valor: s.ocupacaoPct,
                  nota: formatarPct(s.ocupacaoPct),
                  tom: (s.nivel === "folga"
                    ? "sucesso"
                    : s.nivel === "atencao"
                      ? "aviso"
                      : "marinho") as TomGrafico,
                },
              ]
            : [];
        })
      : [];
  return (
    <PainelGrafico
      titulo="Ocupação por região"
      nota={semana ? `semana de ${dataCurta(semana)}` : undefined}
      leitura="Quanto da capacidade de cada região já está ocupada."
      vazio={itens.length === 0 ? VAZIO_GENTIL : undefined}
    >
      {itens.length > 0 ? (
        <BarrasHorizontais
          rotulo="Ocupação por região, em porcentagem"
          larguraRotulo="7rem"
          itens={itens}
        />
      ) : null}
    </PainelGrafico>
  );
}

function GraficoVisitasDia({
  semana,
  hoje,
}: {
  semana: AgendaPeriodo | null;
  hoje: string;
}) {
  const dias = semana
    ? visitasPorDia(visitasQueContam(semana.visitas), inicioDaSemana(hoje))
    : [];
  const total = dias.reduce((s, d) => s + d.total, 0);
  return (
    <PainelGrafico
      titulo="Ritmo da semana"
      nota={
        semana
          ? `${plural(total, "visita", "visitas")} de segunda a domingo`
          : undefined
      }
      vazio={!semana || total === 0 ? VAZIO_GENTIL : undefined}
    >
      {semana && total > 0 ? (
        <div className="flex flex-col gap-1.5">
          <Sparkline
            valores={dias.map((d) => d.total)}
            tom="dourado"
            rotulo={`Visitas por dia: ${dias.map((d, i) => `${DIAS_CURTOS[i]} ${d.total}`).join(", ")}`}
            className="h-28 w-full"
          />
          <div className="flex">
            {dias.map((d, i) => (
              <span
                key={d.dia}
                className={`text-apoio flex-1 text-center ${d.dia === hoje ? "text-texto font-semibold" : "text-texto-3"}`}
              >
                {DIAS_CURTOS[i]}
              </span>
            ))}
          </div>
        </div>
      ) : null}
    </PainelGrafico>
  );
}

function GraficoMeta({ dados }: { dados: DadosPainel | null }) {
  const a = dados?.atual;
  return (
    <PainelGrafico
      titulo="Meta de contratos"
      nota={a ? "contratos assinados no mês" : undefined}
      vazio={
        a
          ? undefined
          : "A meta do mês aparece aqui depois da verificação em duas etapas."
      }
    >
      {a ? (
        a.metas.contratosMes > 24 ? (
          <p className="font-titulo text-3 text-texto">
            {a.comercial.contratosAssinados} de {a.metas.contratosMes}
          </p>
        ) : (
          <AnelMeta
            feitos={a.comercial.contratosAssinados}
            meta={a.metas.contratosMes}
          />
        )
      ) : null}
    </PainelGrafico>
  );
}

// --- Blocos ------------------------------------------------------------------------

function NaoCarregou({ oque }: { oque: string }) {
  return (
    <p className="rounded-2 bg-superficie text-apoio text-texto p-4">
      {oque} não carregou agora. Nada se perdeu: confira a conexão e recarregue
      a página.
    </p>
  );
}

function Frase({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-corpo text-texto max-w-[60ch] px-1 pb-1">{children}</p>
  );
}

function Linha({
  href,
  titulo,
  apoio,
  lateral,
}: {
  href: string;
  titulo: React.ReactNode;
  apoio?: React.ReactNode;
  lateral?: React.ReactNode;
}) {
  return (
    <li>
      <Link
        href={href}
        className="rounded-2 bg-superficie ease-estado hover:shadow-1 flex min-h-[64px] items-center gap-3 px-4 py-3 text-inherit no-underline transition-shadow duration-140"
      >
        <span className="flex min-w-0 flex-1 flex-col gap-0.5">
          <span className="text-corpo text-texto leading-snug font-semibold">
            {titulo}
          </span>
          {apoio ? (
            <span className="text-apoio text-texto-2">{apoio}</span>
          ) : null}
        </span>
        {lateral}
      </Link>
    </li>
  );
}

function BlocoAlertas({ alertas }: { alertas: AlertaClinicoResumo[] | null }) {
  const lista = alertas ? alertasEmOrdem(alertas) : [];
  return (
    <BlocoAba
      tom="neutro"
      icone={<Siren />}
      titulo="Alertas clínicos"
      idTitulo="inicio-alertas"
      contagem={alertas ? alertas.length : undefined}
      acao={{ rotulo: "Abrir os alertas clínicos", href: "/alertas-clinicos" }}
    >
      {alertas === null ? (
        <NaoCarregou oque="A lista de alertas" />
      ) : (
        <>
          <Frase>{fraseAlertas(alertas)}</Frase>
          {lista.length > 0 ? (
            <ul className="flex flex-col gap-2">
              {lista.slice(0, 4).map((a) => (
                <Linha
                  key={a.id}
                  href="/alertas-clinicos"
                  titulo={a.nomeFamilia}
                  apoio={
                    a.diaNumero
                      ? `D${a.diaNumero}, ${a.acionadoEm ? "acionamento registrado" : "espera o registro do acionamento"}`
                      : a.acionadoEm
                        ? "acionamento registrado"
                        : "espera o registro do acionamento"
                  }
                  lateral={
                    <Selo
                      variante={
                        a.estadoSensivel !== "normal"
                          ? "sensivel"
                          : a.severidade === "imediato"
                            ? "alerta"
                            : a.severidade === "prioritario"
                              ? "aviso"
                              : "neutro"
                      }
                    >
                      {ROTULO_SEVERIDADE[a.severidade]}
                    </Selo>
                  }
                />
              ))}
            </ul>
          ) : null}
        </>
      )}
    </BlocoAba>
  );
}

function BlocoVisitasHoje({
  porEnfermeira,
  limite,
}: {
  porEnfermeira: VisitasDaEnfermeira[] | null;
  limite: number | null;
}) {
  return (
    <BlocoAba
      tom="argila"
      icone={<MapPin />}
      titulo="Visitas de hoje"
      idTitulo="inicio-visitas"
      contagem={
        porEnfermeira
          ? porEnfermeira.reduce((s, e) => s + e.visitas.length, 0)
          : undefined
      }
      acao={{ rotulo: "Ver a agenda do dia", href: "/agenda?visao=dia" }}
    >
      {porEnfermeira === null ? (
        <NaoCarregou oque="A agenda de hoje" />
      ) : porEnfermeira.length === 0 ? (
        <Frase>
          Nenhuma visita marcada para hoje. As visitas aparecem aqui por
          enfermeira, na ordem do dia.
        </Frase>
      ) : (
        <ul className="flex flex-col gap-2">
          {porEnfermeira.map((e) => (
            <li
              key={e.profissionalId}
              className="rounded-2 bg-superficie flex flex-col gap-2 px-4 py-3"
            >
              <div className="flex items-baseline justify-between gap-3">
                <span className="text-corpo text-texto font-semibold">
                  {e.nome}
                </span>
                {limite ? (
                  <span className="text-apoio text-texto-2">
                    {linhaDaEnfermeira(e.visitas.length, limite)}
                  </span>
                ) : null}
              </div>
              {limite ? (
                <span aria-hidden="true" className="flex gap-1">
                  {Array.from({
                    length: Math.max(limite, e.visitas.length),
                  }).map((_, i) => (
                    <span
                      key={i}
                      className={
                        i < e.visitas.length
                          ? "rounded-pilula bg-marinho h-2 flex-1"
                          : "rounded-pilula bg-argila-media h-2 flex-1"
                      }
                    />
                  ))}
                </span>
              ) : null}
              <span className="text-apoio text-texto-2">
                {e.visitas
                  .map(
                    (v) =>
                      `${horaCurta(v.horaPrevista) ?? (v.turno === "tarde" ? "tarde" : "manhã")} ${v.nomeExibicao}`,
                  )
                  .join(" · ")}
              </span>
            </li>
          ))}
        </ul>
      )}
    </BlocoAba>
  );
}

function BlocoRadar({
  radar,
  hoje,
}: {
  radar: RadarDados | null;
  hoje: string;
}) {
  const domingo = somarDias(inicioDaSemana(hoje), 6);
  const semana = radar ? radarDaSemana(radar.familias, hoje, domingo) : [];
  return (
    <BlocoAba
      tom="lavanda"
      icone={<Radar />}
      titulo="Radar da semana"
      idTitulo="inicio-radar"
      contagem={radar ? semana.length + radar.nasceram.length : undefined}
      acao={{ rotulo: "Abrir o radar", href: "/radar" }}
    >
      {radar === null ? (
        <NaoCarregou oque="O radar" />
      ) : (
        <>
          <Frase>{fraseRadar(semana.length, radar.nasceram.length)}</Frase>
          {semana.length + radar.nasceram.length > 0 ? (
            <ul className="flex flex-col gap-2">
              {radar.nasceram.slice(0, 3).map((n) => (
                <Linha
                  key={`n-${n.familiaId}`}
                  href={`/radar/${n.familiaId}`}
                  titulo={n.nome}
                  apoio={linhaNasceu(n)}
                />
              ))}
              {semana.slice(0, 4).map((f) => (
                <Linha
                  key={f.familiaId}
                  href={`/radar/${f.familiaId}`}
                  titulo={f.nome}
                  apoio={linhaRadar(f)}
                  lateral={
                    f.estadoSensivel !== "normal" ? (
                      <Selo variante="sensivel">
                        {ROTULO_ESTADO_SENSIVEL[f.estadoSensivel]}
                      </Selo>
                    ) : !f.titular ? (
                      <Selo variante="aviso">Sem titular</Selo>
                    ) : null
                  }
                />
              ))}
            </ul>
          ) : null}
        </>
      )}
    </BlocoAba>
  );
}

function BlocoSessoes({ sessoes }: { sessoes: SessaoVenda[] | null }) {
  const agenda = sessoes ? separarAgenda(sessoes) : null;
  const proximas = agenda
    ? agenda.proximas.reduce((s, g) => s + g.sessoes.length, 0)
    : 0;
  return (
    <BlocoAba
      tom="argila"
      icone={<MessagesSquare />}
      titulo="Conversas de orientação"
      idTitulo="inicio-sessoes"
      contagem={agenda ? agenda.pedemRegistro.length : undefined}
      acao={{ rotulo: "Abrir as sessões de venda", href: "/sessoes-venda" }}
    >
      {agenda === null ? (
        <NaoCarregou oque="A agenda das conversas" />
      ) : (
        <>
          <Frase>{fraseSessoes(agenda.pedemRegistro.length, proximas)}</Frase>
          {agenda.pedemRegistro.length > 0 ? (
            <ul className="flex flex-col gap-2">
              {agenda.pedemRegistro.slice(0, 3).map((s) => (
                <Linha
                  key={s.id}
                  href={`/sessoes-venda/${s.id}`}
                  titulo={s.nomeFamilia}
                  apoio={s.agendadaPara ? quandoSessao(s.agendadaPara) : null}
                  lateral={<Selo variante="aviso">Espera registro</Selo>}
                />
              ))}
            </ul>
          ) : null}
        </>
      )}
    </BlocoAba>
  );
}

function BlocoCapacidade({ visao }: { visao: CapacidadeVisao | null }) {
  return (
    <BlocoAba
      tom="lavanda"
      icone={<BarChart3 />}
      titulo="Capacidade"
      idTitulo="inicio-capacidade"
      contagem={visao ? visao.alertas.length : undefined}
      acao={{ rotulo: "Abrir a capacidade", href: "/capacidade" }}
    >
      {visao === null ? (
        <NaoCarregou oque="A capacidade" />
      ) : (
        <>
          <Frase>{fraseResumo(visao)}</Frase>
          {visao.alertas.length > 0 ? (
            <ul className="flex flex-col gap-2">
              {visao.alertas.slice(0, 4).map((a) => (
                <Linha
                  key={`${a.regiaoId}-${a.semana}`}
                  href="/capacidade"
                  titulo={tituloDoAlerta(a)}
                  lateral={
                    <Selo
                      variante={a.nivel === "sobrevenda" ? "alerta" : "aviso"}
                    >
                      {ROTULO_NIVEL[a.nivel]}
                    </Selo>
                  }
                />
              ))}
            </ul>
          ) : null}
        </>
      )}
    </BlocoAba>
  );
}

function BlocoPainel({ mostrarMes }: { mostrarMes: boolean }) {
  return (
    <BlocoAba
      tom="argila"
      icone={<Users />}
      titulo="Painel executivo"
      idTitulo="inicio-painel"
      acao={{ rotulo: "Abrir o painel executivo", href: "/painel" }}
    >
      <Frase>
        {mostrarMes
          ? "Venda, marketing, operação, experiência e dinheiro do mês, cada um comparado com o mês anterior e com a meta."
          : "Os números do mês pedem a verificação em duas etapas. Abra o painel para confirmar o código e ver venda, operação e dinheiro."}
      </Frase>
    </BlocoAba>
  );
}
