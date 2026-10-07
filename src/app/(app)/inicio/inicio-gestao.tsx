import Link from "next/link";
import { Baby, Clock, Heart, PenLine, TriangleAlert } from "lucide-react";
import { saudacao } from "@/components/shell/saudacao";
import {
  Card,
  CardHead,
  classesChip,
  Nota,
  tabelaMock,
} from "@/components/mockup";
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
import type {
  AgendaPeriodo,
  EquipeVisao,
  EstadoVisita,
  VisitaAgenda,
} from "@/lib/dados/tipos-equipe";
import type { Radar as RadarDados } from "@/lib/dados/tipos-operacao";
import type { CapacidadeVisao } from "@/lib/dados/tipos-gestao";
import type { SessaoVenda } from "@/lib/dados/tipos-venda";
import { formatarMoeda } from "@/lib/formatacao";
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
  CartaoLista,
  Colunas,
  Divisao,
  FaixaDoDia,
  Funil,
  GradeGraficos,
  GradeIndicadores,
  LinhaLista,
  PainelGrafico,
  Rosca,
  Sparkline,
  type Indicador,
} from "@/modules/inicio/painel-gestao";
import type { Dre } from "@/lib/dados/tipos-gestao";
import { ROTULO_ESTADO_SENSIVEL } from "@/modules/crm/ficha/rotulos";
import { separarAgenda } from "@/modules/crm/sessao-venda/agenda";
import { obterTelaCapacidade } from "@/modules/operacao/capacidade/dados";
import { tituloDoAlerta } from "@/modules/operacao/capacidade/textos";
import { ROTULO_ESTADO_VISITA } from "@/modules/operacao/equipe/textos";
import { fraseSinteseEquipe } from "@/modules/operacao/equipe/textos";
import { obterTelaPainel, type DadosPainel } from "@/modules/painel/dados";
import { contraAnterior, fraseDoPainel } from "@/modules/painel/textos";
import {
  alertasEmOrdem,
  contextoFichas,
  contextoOfertas,
  contextoVisitasHoje,
  fichasSemAssinatura,
  linhaDaEnfermeira,
  linhaNasceu,
  radarDaSemana,
  ROTULO_SEVERIDADE,
  visitasPorEnfermeira,
  visitasQueContam,
  type VisitasDaEnfermeira,
} from "./textos-gestao";

/**
 * Início da coordenação e da diretoria, no desenho do `#v-home` do HTML da
 * cliente: faixa do dia, quatro indicadores com mini gráfico, três gráficos,
 * e a divisão com alertas e agenda de hoje de um lado e, do outro, "Precisa
 * de decisão", fichas e "Encerrando". Só leituras que já existem; cada uma
 * falha sozinha, sem derrubar o Início (o bloco diz que não carregou).
 * Alertas clínicos ficam sem tom de apoio (PRD 20.2 [v4.4], regra 3).
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
        frase={
          dia.equipe
            ? `Equipe agora: ${fraseSinteseEquipe(dia.equipe.resumo)}`
            : undefined
        }
      />
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
      <CorpoDoDia
        dia={dia}
        radar={radar}
        sessoes={sessoes}
        visao={visao}
        atalhos={[
          { rotulo: "Alertas clínicos", href: "/alertas-clinicos" },
          { rotulo: "Radar", href: "/radar" },
          { rotulo: "Capacidade", href: "/capacidade" },
          { rotulo: "Sessões de venda", href: "/sessoes-venda" },
        ]}
      />
      <GradeGraficos colunas={2}>
        <GraficoRegioes visao={visao} />
        <GraficoVisitasDia semana={dia.semana} hoje={dia.hoje} />
      </GradeGraficos>
    </>
  );
}

export async function InicioDiretoria({ sessao }: { sessao: SessaoUsuario }) {
  const repos = await obterRepositorios();
  const [dia, painel, capacidade, radar, dre, sessoes] = await Promise.all([
    lerDoDia(),
    tentar(() => obterTelaPainel(sessao, null)),
    tentar(() => obterTelaCapacidade(sessao)),
    tentar(() => repos.operacao.radar(null)),
    tentar(() => repos.gestao.dre(null)),
    tentar(() => repos.venda.listarSessoes()),
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
        frase={
          dadosPainel
            ? fraseDoPainel(dadosPainel.atual)
            : dia.equipe
              ? `Equipe agora: ${fraseSinteseEquipe(dia.equipe.resumo)}`
              : undefined
        }
      />
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
      <CorpoDoDia
        dia={dia}
        radar={radar}
        sessoes={sessoes}
        visao={visao}
        atalhos={[
          { rotulo: "Alertas clínicos", href: "/alertas-clinicos" },
          { rotulo: "Radar", href: "/radar" },
          { rotulo: "Capacidade", href: "/capacidade" },
          { rotulo: "Painel executivo", href: "/painel" },
        ]}
      />
      <GradeGraficos colunas={2}>
        <GraficoRegioes visao={visao} />
        <GraficoMeta dados={dadosPainel} />
      </GradeGraficos>
    </>
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
      nota="conversão entre etapas"
      leitura="Barras maiores são etapas com mais famílias; a porcentagem à direita compara cada etapa com a anterior."
      vazio={
        c
          ? undefined
          : "Os números de venda pedem a verificação em duas etapas. Abra o painel executivo para confirmar."
      }
    >
      {c ? (
        <Funil
          rotulo="Funil do mês"
          etapas={[
            { rotulo: "Leads", valor: c.leads, tom: "dourado" },
            { rotulo: "Sessões", valor: c.sessoesRealizadas, tom: "marinho" },
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

// --- Corpo do dia (divisão do mockup) ------------------------------------------------

const ESTADO_SELO: Partial<
  Record<EstadoVisita, "sucesso" | "aviso" | "destaque" | "neutro">
> = {
  concluida: "sucesso",
  ficha_entregue: "sucesso",
  encerrada: "sucesso",
  ficha_pendente: "aviso",
  a_caminho: "destaque",
  iniciada: "destaque",
};

function NaoCarregou({ oque }: { oque: string }) {
  return (
    <Nota tom="alerta" className="m-4">
      {oque} não carregou agora. Nada se perdeu: confira a conexão e recarregue
      a página.
    </Nota>
  );
}

function VazioCartao({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-tinta-70 p-4 text-[12.5px] leading-normal">{children}</p>
  );
}

function CorpoDoDia({
  dia,
  radar,
  sessoes,
  visao,
  atalhos,
}: {
  dia: DadosDoDia;
  radar: RadarDados | null;
  sessoes: SessaoVenda[] | null;
  visao: CapacidadeVisao | null;
  atalhos: { rotulo: string; href: string }[];
}) {
  const contam = dia.semana ? visitasQueContam(dia.semana.visitas) : null;
  const deHoje = contam
    ? contam
        .filter((v) => v.data === dia.hoje)
        .sort((a, b) =>
          (a.horaPrevista ?? "99").localeCompare(b.horaPrevista ?? "99"),
        )
    : null;
  const fichas = dia.semana ? fichasSemAssinatura(dia.semana.visitas) : [];
  const lista = dia.alertas ? alertasEmOrdem(dia.alertas) : [];
  const nasceram = radar?.nasceram ?? [];
  const agenda = sessoes ? separarAgenda(sessoes) : null;
  const pedemRegistro = agenda?.pedemRegistro.length ?? 0;
  const domingo = somarDias(inicioDaSemana(dia.hoje), 6);
  const semTitular = radar
    ? radarDaSemana(radar.familias, dia.hoje, domingo).filter((f) => !f.titular)
    : [];
  const conflitos = contam
    ? contam.filter((v) => v.conflitos.length > 0).length
    : 0;
  const sobrevenda = visao
    ? visao.alertas.filter((a) => a.nivel === "sobrevenda").slice(0, 2)
    : [];
  const encerrando = contam ? encerrandoNaSemana(contam) : [];

  const totalAlertas =
    (dia.alertas?.length ?? 0) + (fichas.length > 0 ? 1 : 0) + nasceram.length;
  const nada =
    lista.length === 0 && fichas.length === 0 && nasceram.length === 0;

  return (
    <div className="mb-[14px]">
      <Divisao
        principal={
          <>
            <CartaoLista
              titulo="Alertas prioritários"
              idTour="/inicio:alertas"
              direita={dia.alertas ? `${totalAlertas} abertos` : undefined}
            >
              {dia.alertas === null ? (
                <NaoCarregou oque="A lista de alertas" />
              ) : nada ? (
                <VazioCartao>
                  Nenhum alerta aberto agora. Quando houver, eles aparecem aqui
                  em ordem de urgência.
                </VazioCartao>
              ) : (
                <ul>
                  {lista.slice(0, 4).map((a) => {
                    const sensivel = a.estadoSensivel !== "normal";
                    return (
                      <LinhaLista
                        key={a.id}
                        href="/alertas-clinicos"
                        tom={
                          sensivel
                            ? "sensivel"
                            : a.severidade === "imediato"
                              ? "alerta"
                              : "aviso"
                        }
                        icone={
                          sensivel ? (
                            <Heart />
                          ) : a.severidade === "imediato" ? (
                            <TriangleAlert />
                          ) : (
                            <Clock />
                          )
                        }
                        titulo={
                          <>
                            <b>{a.nomeFamilia}.</b>{" "}
                            {sensivel
                              ? `Estado sensível: ${ROTULO_ESTADO_SENSIVEL[a.estadoSensivel]}.`
                              : `Alerta clínico, ${ROTULO_SEVERIDADE[a.severidade].toLowerCase()}.`}
                          </>
                        }
                        apoio={
                          a.diaNumero
                            ? `D${a.diaNumero}, ${a.acionadoEm ? "acionamento registrado" : "espera o registro do acionamento"}`
                            : a.acionadoEm
                              ? "acionamento registrado"
                              : "espera o registro do acionamento"
                        }
                      />
                    );
                  })}
                  {fichas.length > 0 ? (
                    <LinhaLista
                      href="/agenda"
                      tom="dourado"
                      icone={<PenLine />}
                      titulo={
                        <>
                          <b>
                            {fichas.length === 1
                              ? "Uma ficha de atendimento sem assinatura."
                              : `${fichas.length} fichas de atendimento sem assinatura.`}
                          </b>{" "}
                          A visita já terminou e o registro ainda não foi
                          entregue.
                        </>
                      }
                      apoio={contextoFichas(fichas.length)}
                    />
                  ) : null}
                  {nasceram.slice(0, 2).map((n) => (
                    <LinhaLista
                      key={n.familiaId}
                      href={`/radar/${n.familiaId}`}
                      tom="dourado"
                      icone={<Baby />}
                      titulo={
                        <>
                          <b>{n.nome}.</b> {linhaNasceu(n)}.
                        </>
                      }
                    />
                  ))}
                </ul>
              )}
              <div className="border-fio-3 flex flex-wrap gap-1.5 border-t px-4 py-3">
                {atalhos.map((at) => (
                  <Link
                    key={at.href}
                    href={at.href}
                    className={`${classesChip()} min-h-[44px] text-[11.5px] lg:min-h-0`}
                  >
                    {at.rotulo}
                  </Link>
                ))}
              </div>
            </CartaoLista>

            <Card data-tour="/inicio:agenda">
              <CardHead
                titulo="Agenda de hoje"
                direita={
                  deHoje
                    ? `${new Set(deHoje.map((v) => v.profissionalId)).size} profissionais em campo`
                    : undefined
                }
              />
              {deHoje === null ? (
                <NaoCarregou oque="A agenda de hoje" />
              ) : deHoje.length === 0 ? (
                <VazioCartao>
                  Nenhuma visita marcada para hoje. As visitas aparecem aqui na
                  ordem do dia.
                </VazioCartao>
              ) : (
                <div className="overflow-x-auto">
                  <TabelaAgenda
                    visitas={deHoje}
                    limite={dia.semana?.limiteVisitasDia ?? null}
                  />
                </div>
              )}
              <div className="border-fio-3 border-t px-4 py-3">
                <Link
                  href="/agenda?visao=dia"
                  className={`${classesChip()} min-h-[44px] text-[11.5px] lg:min-h-0`}
                >
                  Ver a agenda do dia
                </Link>
              </div>
            </Card>
          </>
        }
        lateral={
          <>
            <CartaoLista titulo="Precisa de decisão" idTour="/inicio:decisoes">
              <div className="flex flex-col gap-[11px] p-4 pt-3">
                {conflitos > 0 ? (
                  <DecisaoItem
                    tag="Conflito de escala"
                    tom="alerta"
                    texto={`${conflitos === 1 ? "Uma visita desta semana entra" : `${conflitos} visitas desta semana entram`} em conflito de agenda.`}
                    acao={{ rotulo: "Ver agenda", href: "/agenda" }}
                  />
                ) : null}
                {sobrevenda.map((a) => (
                  <DecisaoItem
                    key={`${a.regiaoId}-${a.semana}`}
                    tag="Capacidade"
                    tom="alerta"
                    texto={`${tituloDoAlerta(a)}: risco de passar do limite de famílias.`}
                    acao={{ rotulo: "Ver capacidade", href: "/capacidade" }}
                  />
                ))}
                {pedemRegistro > 0 ? (
                  <DecisaoItem
                    tag="Aguardando você"
                    tom="aviso"
                    texto={`${pedemRegistro === 1 ? "Uma conversa de orientação espera" : `${pedemRegistro} conversas de orientação esperam`} registro.`}
                    acao={{ rotulo: "Registrar", href: "/sessoes-venda" }}
                  />
                ) : null}
                {semTitular.length > 0 ? (
                  <DecisaoItem
                    tag="Sem enfermeira titular"
                    tom="aviso"
                    texto={`${semTitular.length === 1 ? "Uma família da semana está" : `${semTitular.length} famílias da semana estão`} sem enfermeira titular.`}
                    acao={{ rotulo: "Abrir radar", href: "/radar" }}
                  />
                ) : null}
                {conflitos === 0 &&
                sobrevenda.length === 0 &&
                pedemRegistro === 0 &&
                semTitular.length === 0 ? (
                  <p className="text-tinta-70 text-[12.5px] leading-normal">
                    {contam && sessoes && radar && visao
                      ? "Nada pede decisão agora. Conflitos de escala, capacidade no limite e conversas sem registro aparecem aqui."
                      : "Parte das leituras não carregou agora. Nada se perdeu: recarregue a página."}
                  </p>
                ) : null}
              </div>
            </CartaoLista>

            <Card>
              <CardHead titulo="Fichas no prazo" />
              <VazioCartao>
                {dia.semana
                  ? fichas.length === 0
                    ? "Nenhuma ficha sem assinatura nesta semana. O percentual no prazo ainda não é medido pelo sistema."
                    : `${fichas.length === 1 ? "Uma ficha segue sem assinatura" : `${fichas.length} fichas seguem sem assinatura`} nesta semana. O percentual no prazo ainda não é medido pelo sistema.`
                  : "A agenda não carregou agora. Nada se perdeu: recarregue a página."}
              </VazioCartao>
            </Card>

            <CartaoLista titulo="Encerrando">
              {contam === null ? (
                <NaoCarregou oque="A agenda da semana" />
              ) : encerrando.length === 0 ? (
                <VazioCartao>
                  Nenhum acompanhamento termina nesta semana. Quando houver, a
                  família aparece aqui com o dia da última visita.
                </VazioCartao>
              ) : (
                <ul className="px-4 py-3 text-[11.5px] leading-[1.7]">
                  {encerrando.map((v) => (
                    <li
                      key={v.acompanhamentoId}
                      className="border-fio-3 flex justify-between gap-3 border-t py-[5px] first:border-t-0"
                    >
                      <span>
                        <b>{v.nomeExibicao}</b> · D{v.diaNumero} de{" "}
                        {v.diasContratados}
                      </span>
                      <span className="text-tinta-50 shrink-0">
                        {dataCurta(v.data)}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </CartaoLista>
          </>
        }
      />
    </div>
  );
}

/** Acompanhamentos cuja última visita contratada cai na semana. */
function encerrandoNaSemana(visitas: VisitaAgenda[]): VisitaAgenda[] {
  const porAcompanhamento = new Map<string, VisitaAgenda>();
  for (const v of visitas) {
    if (v.diaNumero === v.diasContratados)
      porAcompanhamento.set(v.acompanhamentoId, v);
  }
  return [...porAcompanhamento.values()].sort((a, b) =>
    a.data.localeCompare(b.data),
  );
}

function DecisaoItem({
  tag,
  tom,
  texto,
  acao,
}: {
  tag: string;
  tom: "alerta" | "aviso";
  texto: string;
  acao: { rotulo: string; href: string };
}) {
  return (
    <div className="border-fio-3 border-b pb-[11px] last:border-b-0 last:pb-0">
      <Selo variante={tom} className="mb-1.5">
        {tag}
      </Selo>
      <p className="text-[12.5px] leading-[1.55]">{texto}</p>
      <div className="mt-[9px] flex gap-1.5">
        <Link
          href={acao.href}
          className={`${classesChip(true)} min-h-[44px] text-[11.5px] lg:min-h-0`}
        >
          {acao.rotulo}
        </Link>
      </div>
    </div>
  );
}

function TabelaAgenda({
  visitas,
  limite,
}: {
  visitas: VisitaAgenda[];
  limite: number | null;
}) {
  return (
    <table className={tabelaMock.tabela}>
      <thead>
        <tr>
          <th className={`${tabelaMock.th} w-[74px]`}>Horário</th>
          <th className={tabelaMock.th}>Família</th>
          <th className={tabelaMock.th}>Profissional</th>
          <th className={tabelaMock.th}>Região</th>
          <th className={tabelaMock.th}>Dia</th>
          <th className={`${tabelaMock.th} w-[132px]`}>Status</th>
        </tr>
      </thead>
      <tbody>
        {visitas.map((v) => (
          <tr key={v.visitaId} className={tabelaMock.tr}>
            <td className={`${tabelaMock.td} font-mono text-[11.5px]`}>
              {horaCurta(v.horaPrevista) ??
                (v.turno === "tarde" ? "tarde" : "manhã")}
            </td>
            <td className={tabelaMock.td}>
              <Link
                href={`/agenda/visitas/${v.visitaId}`}
                className={`${tabelaMock.nome} text-inherit no-underline hover:underline`}
              >
                {v.nomeExibicao}
              </Link>
              <div className={tabelaMock.sub}>
                {v.diaNumero} de {v.diasContratados} visitas
              </div>
            </td>
            <td className={tabelaMock.td}>
              {v.profissionalNome}
              {limite ? (
                <div className={tabelaMock.sub}>
                  {linhaDaEnfermeira(
                    visitas.filter((x) => x.profissionalId === v.profissionalId)
                      .length,
                    limite,
                  )}
                </div>
              ) : null}
            </td>
            <td className={tabelaMock.td}>
              {v.bairro ?? v.cidade ?? "Sem região"}
            </td>
            <td className={`${tabelaMock.td} font-mono text-[11.5px]`}>
              D{v.diaNumero}
            </td>
            <td className={tabelaMock.td}>
              <Selo variante={ESTADO_SELO[v.estado] ?? "neutro"}>
                {ROTULO_ESTADO_VISITA[v.estado]}
              </Selo>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
