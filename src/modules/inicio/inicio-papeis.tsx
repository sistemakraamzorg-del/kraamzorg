import * as React from "react";
import { ArrowRight, Inbox, ListTodo } from "lucide-react";
import { saudacao } from "@/components/shell/saudacao";
import { Nota } from "@/components/mockup";
import { FaixaAlerta } from "@/components/ui/faixa-alerta";
import { TileIcone } from "@/components/ui/tile-icone";
import { hojeBrasilia } from "@/modules/crm/pipeline/idade-gestacional";
import type { SessaoUsuario } from "@/lib/auth/tipos";
import { obterRepositorios } from "@/lib/dados/fabrica";
import type { CartaoOportunidade } from "@/lib/dados/tipos";
import type { Dre, Inadimplencia } from "@/lib/dados/tipos-gestao";
import type { ListaCobrancas } from "@/lib/dados/tipos-contrato";
import type { RelatorioMarketing } from "@/lib/dados/tipos-relacao";
import type { SessaoVenda } from "@/lib/dados/tipos-venda";
import { formatarMoeda } from "@/lib/formatacao";
import { compararComAnterior, nomeMes } from "@/lib/gestao/formato";
import { somarMeses } from "@/lib/gestao/financeiro";
import { fraseDoDia } from "@/app/(app)/inicio/frase-do-dia";
import { FilaTransferencias } from "@/modules/agente/transferencias/componentes/fila-transferencias";
import {
  listarFilaTela,
  obterTelefonePlantao,
} from "@/modules/agente/transferencias/dados";
import { DESTINO_DO_PAPEL } from "@/modules/agente/tipos";
import type { TransferenciaTela } from "@/modules/agente/tipos";
import { ROTULO_ESTAGIO_P1, ORDEM_P1 } from "@/modules/crm/pipeline/estagios";
import { separarAgenda } from "@/modules/crm/sessao-venda/agenda";
import { atalhosDePeriodo } from "@/modules/marketing/periodo";
import { ListaTarefas } from "@/modules/mensageria/tarefas/componentes/lista-tarefas";
import {
  listarTarefasTela,
  type TarefasTela,
} from "@/modules/mensageria/tarefas/dados";
import { ROTULO_ORIGEM } from "@/modules/relacao/rotulos";
import {
  BarrasHorizontais,
  Colunas,
  FaixaDoDia,
  GradeGraficos,
  GradeIndicadores,
  CartaoLista,
  LinhaLista,
  PainelGrafico,
  Rosca,
  type Indicador,
} from "./painel-gestao";

/**
 * Início do comercial, do financeiro e do marketing, no padrão
 * institucional da gestão: faixa do dia, "O que pede ação agora" primeiro,
 * indicadores com comparação e até três gráficos. Só leituras que já
 * existem; cada uma falha sozinha e a tela diz o que não carregou. Sem dado,
 * o gráfico ensina o que vai aparecer ali, nunca um número inventado.
 */

async function tentar<T>(ler: () => Promise<T>): Promise<T | null> {
  try {
    return await ler();
  } catch {
    return null;
  }
}

const VAZIO = (o: string) =>
  `${o} não carregou agora. Nada se perdeu: confira a conexão e recarregue a página.`;

function plural(n: number, um: string, varios: string): string {
  return `${n} ${n === 1 ? um : varios}`;
}

// --- "O que pede ação agora" ------------------------------------------------------

interface Pedido {
  titulo: string;
  apoio: string;
  href: string;
}

function PedeAcao({
  pedidos,
  falhas,
  vazio,
}: {
  pedidos: Pedido[];
  /** O que não carregou, para a tela dizer em vez de calar. */
  falhas: string[];
  vazio: string;
}) {
  return (
    <div className="mb-[14px]">
      <CartaoLista
        titulo="O que pede ação agora"
        direita={pedidos.length > 0 ? `${pedidos.length} abertos` : undefined}
      >
        {falhas.length > 0 ? (
          <Nota tom="alerta" className="m-4">
            <b>{falhas.join(" e ")} não carregou.</b> Nada se perdeu. Confira a
            conexão e recarregue a página.
          </Nota>
        ) : null}
        {pedidos.length > 0 ? (
          <ul>
            {pedidos.map((p) => (
              <LinhaLista
                key={p.titulo}
                href={p.href}
                tom="dourado"
                icone={<ArrowRight />}
                titulo={<b>{p.titulo}</b>}
                apoio={p.apoio}
              />
            ))}
          </ul>
        ) : falhas.length === 0 ? (
          <p className="text-tinta-70 p-4 text-[12.5px] leading-normal">
            <b>Nada pede ação agora.</b> {vazio}
          </p>
        ) : null}
      </CartaoLista>
    </div>
  );
}

// --- Comercial -----------------------------------------------------------------------

export async function InicioComercial({
  usuarioId,
  nome,
}: {
  usuarioId: string;
  nome: string;
}) {
  let fila: TransferenciaTela[] | null = null;
  let tela: TarefasTela | null = null;
  let telefonePlantao: string | null = null;
  const repos = await obterRepositorios();
  const [filaTarefas, sessoes, cartoes] = await Promise.all([
    tentar(() =>
      Promise.all([
        listarFilaTela(),
        listarTarefasTela(),
        obterTelefonePlantao(),
      ]),
    ),
    tentar(() => repos.venda.listarSessoes()),
    tentar(() => repos.familias.listarPipeline({ pipeline: 1 })),
  ]);
  if (filaTarefas) [fila, tela, telefonePlantao] = filaTarefas;

  const gruposHoje =
    tela?.grupos.filter(
      (g) => g.balde === "vencida" || g.balde === "vence_hoje",
    ) ?? [];
  const atrasadas =
    gruposHoje.find((g) => g.balde === "vencida")?.tarefas.length ?? 0;
  const hoje =
    gruposHoje.find((g) => g.balde === "vence_hoje")?.tarefas.length ?? 0;
  const esperando = fila?.filter((t) => t.status === "aberto") ?? [];
  const comEquipe = fila?.filter((t) => t.status === "assumido") ?? [];
  const comVoce = comEquipe.filter((t) => t.assumidoPor === usuarioId).length;
  const agenda = sessoes ? separarAgenda(sessoes) : null;
  const marcadas = agenda
    ? agenda.proximas.reduce((s, g) => s + g.sessoes.length, 0)
    : null;
  const abertos = cartoes
    ? cartoes.filter((c) => !FORA_DO_FUNIL.includes(c.estagioP1 ?? "novo"))
    : null;
  const quentes = abertos?.filter((c) => c.classificacao === "quente").length;

  const contagem =
    fila && tela
      ? {
          transferenciasEsperando: esperando.length,
          transferenciasComEquipe: comEquipe.length,
          tarefasAtrasadas: atrasadas,
          tarefasHoje: hoje,
        }
      : null;
  const pedidos: Pedido[] = [];
  if (esperando.length > 0)
    pedidos.push({
      titulo: plural(
        esperando.length,
        "transferência espera",
        "transferências esperam",
      ),
      apoio: "Famílias aguardam alguém da equipe. Assuma uma para começar.",
      href: "#inicio-transferencias",
    });
  if (atrasadas + hoje > 0)
    pedidos.push({
      titulo: plural(
        atrasadas + hoje,
        "tarefa vence hoje",
        "tarefas vencem hoje",
      ),
      apoio:
        atrasadas > 0
          ? `${plural(atrasadas, "já passou do prazo", "já passaram do prazo")}. Comece por elas.`
          : "Nenhuma está atrasada.",
      href: "#inicio-tarefas",
    });
  if (agenda && agenda.pedemRegistro.length > 0)
    pedidos.push({
      titulo: plural(
        agenda.pedemRegistro.length,
        "conversa espera registro",
        "conversas esperam registro",
      ),
      apoio: "O horário já passou e falta registrar como foi.",
      href: "/sessoes-venda",
    });

  const indicadores: Indicador[] = [];
  if (fila)
    indicadores.push({
      rotulo:
        esperando.length === 1
          ? "Transferência esperando"
          : "Transferências esperando",
      valor: esperando.length,
      contexto: `${comEquipe.length} já com a equipe, ${comVoce} com você`,
      href: "#inicio-transferencias",
      tom: "dourado",
    });
  if (tela)
    indicadores.push({
      rotulo: "Tarefas de hoje",
      valor: atrasadas + hoje,
      contexto:
        atrasadas > 0
          ? `${atrasadas} atrasadas, ${hoje} vencem hoje`
          : `${hoje} vencem hoje, nenhuma atrasada`,
      href: "#inicio-tarefas",
      tom: "dourado",
    });
  if (marcadas !== null && agenda)
    indicadores.push({
      rotulo: marcadas === 1 ? "Conversa marcada" : "Conversas marcadas",
      valor: marcadas,
      contexto: `${agenda.pedemRegistro.length} esperando registro`,
      href: "/sessoes-venda",
      tom: "dourado",
    });
  if (abertos && quentes !== undefined)
    indicadores.push({
      rotulo: quentes === 1 ? "Lead quente" : "Leads quentes",
      valor: quentes,
      contexto: `de ${plural(abertos.length, "lead", "leads")} no funil`,
      href: "/pipeline",
      tom: "dourado",
    });

  return (
    <>
      <FaixaDoDia
        saudacao={saudacao(nome)}
        frase={contagem ? fraseDoDia(contagem) : undefined}
      />
      <PedeAcao
        pedidos={pedidos}
        falhas={[...(filaTarefas ? [] : ["A fila e as tarefas"])]}
        vazio="Quando uma família esperar atendimento ou uma tarefa vencer, ela aparece aqui, em ordem de urgência."
      />
      {indicadores.length > 0 ? <GradeIndicadores itens={indicadores} /> : null}
      <GradeGraficos>
        <GraficoFunilComercial cartoes={cartoes} />
        <GraficoPontuacao cartoes={abertos} falhou={cartoes === null} />
        <GraficoSessoes sessoes={sessoes} />
      </GradeGraficos>
      <div className="grid grid-cols-1 gap-[14px] lg:grid-cols-[62fr_38fr]">
        <section
          aria-labelledby="inicio-transferencias"
          className="scroll-mt-4"
        >
          <div className="mb-3 flex items-center gap-3">
            <TileIcone tom="marinho" forma="quadrado">
              <Inbox />
            </TileIcone>
            <h2
              id="inicio-transferencias"
              className="font-titulo text-2 text-texto"
            >
              Transferências
            </h2>
          </div>
          {fila ? (
            <FilaTransferencias
              fila={fila}
              usuarioId={usuarioId}
              destinoDoPapel={DESTINO_DO_PAPEL.comercial}
              telefonePlantao={telefonePlantao}
            />
          ) : (
            <FaixaAlerta
              variante="erro"
              titulo="A fila de transferências não carregou"
            >
              Nada se perdeu: as transferências continuam abertas. Confira a
              conexão e recarregue a página.
            </FaixaAlerta>
          )}
        </section>
        <section aria-labelledby="inicio-tarefas" className="scroll-mt-4">
          {tela ? (
            <ListaTarefas
              grupos={gruposHoje}
              titulo="Tarefas de hoje"
              idTitulo="inicio-tarefas"
              icone={<ListTodo />}
              tomIcone="lavanda"
            />
          ) : (
            <>
              <h2
                id="inicio-tarefas"
                className="font-titulo text-2 text-texto mb-3"
              >
                Tarefas de hoje
              </h2>
              <FaixaAlerta variante="erro" titulo="As tarefas não carregaram">
                Nada se perdeu: as tarefas continuam abertas. Confira a conexão
                e recarregue a página.
              </FaixaAlerta>
            </>
          )}
        </section>
      </div>
    </>
  );
}

/** Estágios que saem do funil de venda: não contam como lead em andamento. */
const FORA_DO_FUNIL = ["perdido", "nao_qualificado", "fora_de_cobertura"];

const ETAPAS_FUNIL = ORDEM_P1.filter(
  (e) => !FORA_DO_FUNIL.includes(e) && e !== "nutricao",
);

function GraficoFunilComercial({
  cartoes,
}: {
  cartoes: CartaoOportunidade[] | null;
}) {
  const itens = cartoes
    ? ETAPAS_FUNIL.map((e) => ({
        rotulo: ROTULO_ESTAGIO_P1[e],
        valor: cartoes.filter((c) => c.estagioP1 === e).length,
        tom: "dourado" as const,
      }))
    : [];
  const total = itens.reduce((s, i) => s + i.valor, 0);
  return (
    <PainelGrafico
      titulo="Funil de leads"
      nota="quantos leads estão em cada etapa agora"
      leitura="Compare cada etapa com a seguinte: onde a barra encolhe muito, a conversa pede atenção."
      vazio={
        cartoes === null
          ? VAZIO("O funil")
          : total === 0
            ? "Ainda não há leads no funil. Quando o primeiro chegar, as etapas aparecem aqui."
            : undefined
      }
    >
      <BarrasHorizontais
        rotulo="Leads por etapa do funil"
        larguraRotulo="8rem"
        itens={itens}
      />
    </PainelGrafico>
  );
}

function GraficoPontuacao({
  cartoes,
  falhou,
}: {
  cartoes: CartaoOportunidade[] | null | undefined;
  falhou: boolean;
}) {
  const conta = (k: string) =>
    cartoes?.filter((c) => c.classificacao === k).length ?? 0;
  const semNota = cartoes?.filter((c) => !c.classificacao).length ?? 0;
  const fatias = [
    { rotulo: "Quente", valor: conta("quente"), tom: "alerta" as const },
    { rotulo: "Morno", valor: conta("morno"), tom: "aviso" as const },
    { rotulo: "Frio", valor: conta("frio"), tom: "marinho" as const },
    { rotulo: "Sem pontuação", valor: semNota, tom: "areia" as const },
  ].filter((f) => f.valor > 0);
  const total = fatias.reduce((s, f) => s + f.valor, 0);
  return (
    <PainelGrafico
      titulo="Pontuação dos leads"
      nota="leads em andamento por temperatura"
      leitura="Quente é quem está mais perto de decidir; comece por esses."
      vazio={
        falhou
          ? VAZIO("A pontuação")
          : total === 0
            ? "A pontuação aparece quando houver leads em andamento."
            : undefined
      }
    >
      <Rosca
        rotulo="Leads por pontuação"
        fatias={fatias}
        centro={{
          valor: String(total),
          legenda: total === 1 ? "lead" : "leads",
        }}
      />
    </PainelGrafico>
  );
}

function GraficoSessoes({ sessoes }: { sessoes: SessaoVenda[] | null }) {
  const conta = (s: SessaoVenda["status"]) =>
    sessoes?.filter((x) => x.status === s).length ?? 0;
  const itens = [
    { rotulo: "Marcadas", valor: conta("agendada"), tom: "dourado" as const },
    {
      rotulo: "Aconteceram",
      valor: conta("realizada"),
      tom: "sucesso" as const,
    },
    {
      rotulo: "Não vieram",
      valor: conta("nao_compareceu"),
      tom: "aviso" as const,
    },
    {
      rotulo: "Remarcadas",
      valor: conta("remarcada"),
      tom: "marinho" as const,
    },
  ];
  const total = itens.reduce((s, i) => s + i.valor, 0);
  return (
    <PainelGrafico
      titulo="Conversas de orientação"
      nota="todas as sessões de venda, por situação"
      leitura="Compare as que aconteceram com as que a família não veio."
      vazio={
        sessoes === null
          ? VAZIO("A agenda das conversas")
          : total === 0
            ? "Ainda não há conversas de orientação. Elas aparecem aqui assim que a primeira for marcada."
            : undefined
      }
    >
      <BarrasHorizontais
        rotulo="Conversas por situação"
        larguraRotulo="6.5rem"
        itens={itens}
      />
    </PainelGrafico>
  );
}

// --- Financeiro ----------------------------------------------------------------------

/** "1 a 7 dias", "8 a 30 dias", "mais de 30 dias". */
function rotuloFaixa(de: number, ate: number | null): string {
  return ate === null ? `mais de ${de - 1} dias` : `${de} a ${ate} dias`;
}

export async function InicioFinanceiro({ sessao }: { sessao: SessaoUsuario }) {
  const repos = await obterRepositorios();
  const [cobrancas, dre, inad] = await Promise.all([
    tentar<ListaCobrancas>(() => repos.cobrancas.listar()),
    tentar<Dre>(() => repos.gestao.dre(null)),
    tentar<Inadimplencia>(() => repos.gestao.inadimplencia()),
  ]);

  const indice = dre
    ? dre.serie.findIndex((p) => p.mes.slice(0, 7) === dre.mes.slice(0, 7))
    : -1;
  const anterior = indice > 0 ? dre!.serie[indice - 1] : undefined;
  const mesAnterior = dre ? nomeMes(somarMeses(dre.mes, -1)) : "";
  const contra = (atual: number, antes?: number) =>
    antes === undefined
      ? "sem mês anterior para comparar"
      : compararComAnterior(atual, antes, mesAnterior, formatarMoeda)
          .replace(/\.$/, "")
          .replace(/^([A-ZÀ-Ý])(?=[a-zà-ÿ])/, (m) => m.toLowerCase());

  const comErro =
    cobrancas?.cobrancas.filter((c) => c.notaStatus === "erro").length ?? 0;
  const vencidas = inad?.vencidasQtd ?? cobrancas?.resumo.vencidas ?? 0;

  const pedidos: Pedido[] = [];
  if (vencidas > 0)
    pedidos.push({
      titulo: plural(vencidas, "cobrança vencida", "cobranças vencidas"),
      apoio: inad
        ? `${formatarMoeda(inad.vencidoCentavos)} em atraso. Comece pelas mais antigas.`
        : "Confira quem já passou do vencimento.",
      href: "/cobrancas",
    });
  if (comErro > 0)
    pedidos.push({
      titulo: plural(comErro, "nota com erro", "notas com erro"),
      apoio: "A nota não foi emitida. Abra a cobrança para tentar de novo.",
      href: "/notas",
    });

  const indicadores: Indicador[] = [];
  if (dre) {
    indicadores.push(
      {
        rotulo: "Recebido no mês",
        valor: formatarMoeda(dre.receitaCentavos),
        contexto: contra(dre.receitaCentavos, anterior?.receitaCentavos),
        href: "/financeiro",
        tom: "dourado",
        serie: dre.serie.map((p) => p.receitaCentavos / 100),
        rotuloSerie: "Recebimentos dos últimos meses",
        tomGrafico: "sucesso",
      },
      {
        rotulo: "Despesas no mês",
        valor: formatarMoeda(dre.despesasCentavos),
        contexto: contra(dre.despesasCentavos, anterior?.despesasCentavos),
        href: "/financeiro",
        tom: "dourado",
        serie: dre.serie.map((p) => p.despesasCentavos / 100),
        rotuloSerie: "Despesas dos últimos meses",
        tomGrafico: "aviso",
      },
    );
  }
  if (cobrancas)
    indicadores.push({
      rotulo: "A receber",
      valor: formatarMoeda(cobrancas.resumo.aReceberCentavos),
      contexto: `${plural(cobrancas.resumo.abertas, "cobrança aberta", "cobranças abertas")}, ${formatarMoeda(cobrancas.resumo.recebidoCentavos)} já recebidos`,
      href: "/cobrancas",
      tom: "dourado",
    });
  if (inad)
    indicadores.push({
      rotulo: "Vencido",
      valor: formatarMoeda(inad.vencidoCentavos),
      contexto:
        inad.taxaPct === null
          ? "ainda sem cobrança emitida para comparar"
          : `${inad.taxaPct.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}% do emitido até hoje`,
      href: "/cobrancas",
      tom: "dourado",
    });

  const falhas = [
    ...(cobrancas ? [] : ["As cobranças"]),
    ...(dre ? [] : ["O resultado do mês"]),
  ];

  return (
    <>
      <FaixaDoDia
        saudacao={saudacao(sessao.nome)}
        frase={
          inad
            ? inad.vencidasQtd > 0
              ? `${plural(inad.vencidasQtd, "cobrança está vencida", "cobranças estão vencidas")}, somando ${formatarMoeda(inad.vencidoCentavos)}.`
              : "Nenhuma cobrança vencida hoje."
            : undefined
        }
      />
      <PedeAcao
        pedidos={pedidos}
        falhas={falhas}
        vazio="Quando uma cobrança vencer ou uma nota der erro, ela aparece aqui para você resolver."
      />
      {indicadores.length > 0 ? <GradeIndicadores itens={indicadores} /> : null}
      <GradeGraficos colunas={2}>
        <GraficoRecebidoDespesa dre={dre} />
        <GraficoVencidas inad={inad} />
      </GradeGraficos>
    </>
  );
}

function GraficoRecebidoDespesa({ dre }: { dre: Dre | null }) {
  const pontos = dre?.serie ?? [];
  return (
    <PainelGrafico
      titulo="Recebido e despesa por mês"
      nota="em milhares de reais, regime de caixa"
      leitura="Dourado é o que entrou; verde é o que saiu. Quando o dourado supera o verde, o mês fechou no azul."
      vazio={
        dre === null
          ? VAZIO("O resultado do mês")
          : pontos.length === 0
            ? "Assim que houver recebimentos ou despesas lançados, os meses aparecem aqui lado a lado."
            : undefined
      }
    >
      <Colunas
        rotulo="Recebido e despesa por mês, em milhares de reais"
        tom="dourado"
        tom2="aviso"
        itens={pontos.map((p) => ({
          rotulo: nomeMes(p.mes).slice(0, 3),
          valor: Math.round(p.receitaCentavos / 10000) / 10,
          valor2: Math.round(p.despesasCentavos / 10000) / 10,
          dica: `${nomeMes(p.mes)}: recebido ${formatarMoeda(p.receitaCentavos)}, despesa ${formatarMoeda(p.despesasCentavos)}`,
        }))}
      />
    </PainelGrafico>
  );
}

function GraficoVencidas({ inad }: { inad: Inadimplencia | null }) {
  return (
    <PainelGrafico
      titulo="Cobranças vencidas por tempo de atraso"
      nota="valor em atraso em cada faixa de dias"
      leitura="Quanto mais à direita, mais antiga a dívida; as faixas longas pedem contato direto."
      vazio={
        inad === null
          ? VAZIO("A inadimplência")
          : inad.vencidasQtd === 0
            ? "Nenhuma cobrança vencida. Se alguma vencer, ela aparece aqui separada por tempo de atraso."
            : undefined
      }
    >
      <BarrasHorizontais
        rotulo="Valor vencido por faixa de atraso"
        larguraRotulo="7rem"
        itens={(inad?.faixas ?? []).map((f) => ({
          rotulo: rotuloFaixa(f.deDias, f.ateDias),
          valor: f.centavos,
          nota: formatarMoeda(f.centavos),
          tom: f.ateDias === null ? "alerta" : "aviso",
          dica: `${rotuloFaixa(f.deDias, f.ateDias)}: ${plural(f.qtd, "cobrança", "cobranças")}, ${formatarMoeda(f.centavos)}`,
        }))}
      />
    </PainelGrafico>
  );
}

// --- Marketing -------------------------------------------------------------------------

const TONS_ORIGEM = [
  "dourado",
  "marinho",
  "sucesso",
  "aviso",
  "sensivel",
  "areia",
] as const;

export async function InicioMarketing({ sessao }: { sessao: SessaoUsuario }) {
  const repos = await obterRepositorios();
  const periodos = atalhosDePeriodo(hojeBrasilia());
  const [mes, passado] = await Promise.all([
    tentar<RelatorioMarketing>(() =>
      repos.relacao.marketing.relatorio(periodos.esteMes),
    ),
    tentar<RelatorioMarketing>(() =>
      repos.relacao.marketing.relatorio(periodos.mesPassado),
    ),
  ]);

  const sem =
    mes?.porOrigem.find((o) => o.origem === "desconhecida")?.leads ?? 0;
  const t = mes?.total;
  const antes = passado?.total;
  const contra = (atual: number, anterior?: number) =>
    anterior === undefined
      ? "sem mês passado para comparar"
      : atual === anterior
        ? "igual ao mês passado"
        : `${Math.abs(atual - anterior)} a ${atual > anterior ? "mais" : "menos"} que no mês passado`;

  const pedidos: Pedido[] = [];
  if (sem > 0)
    pedidos.push({
      titulo: plural(
        sem,
        "lead sem origem conhecida",
        "leads sem origem conhecida",
      ),
      apoio:
        "Sem a origem, não dá para saber qual canal trouxe a família. Confira os links de captação.",
      href: "/marketing",
    });

  const indicadores: Indicador[] = t
    ? [
        {
          rotulo: "Leads no mês",
          valor: t.leads,
          contexto: contra(t.leads, antes?.leads),
          href: "/marketing",
          tom: "dourado",
        },
        {
          rotulo: "Qualificados",
          valor: t.qualificados,
          contexto: `${t.leads > 0 ? Math.round((t.qualificados / t.leads) * 100) : 0}% dos leads, ${contra(t.qualificados, antes?.qualificados)}`,
          href: "/marketing",
          tom: "dourado",
        },
        {
          rotulo: t.ganhos === 1 ? "Família ganha" : "Famílias ganhas",
          valor: t.ganhos,
          contexto: contra(t.ganhos, antes?.ganhos),
          href: "/marketing",
          tom: "dourado",
        },
      ]
    : [];

  return (
    <>
      <FaixaDoDia
        saudacao={saudacao(sessao.nome)}
        frase={
          t
            ? `${plural(t.leads, "lead chegou", "leads chegaram")} neste mês. Os números são agregados, sem dado de família.`
            : undefined
        }
      />
      <PedeAcao
        pedidos={pedidos}
        falhas={mes ? [] : ["O relatório de leads"]}
        vazio="Quando um lead chegar sem origem conhecida, ele aparece aqui para você corrigir o canal."
      />
      {indicadores.length > 0 ? <GradeIndicadores itens={indicadores} /> : null}
      <GradeGraficos colunas={2}>
        <GraficoOrigem relatorio={mes} />
        <GraficoFunilMarketing relatorio={mes} />
      </GradeGraficos>
    </>
  );
}

function GraficoOrigem({
  relatorio,
}: {
  relatorio: RelatorioMarketing | null;
}) {
  const fatias = (relatorio?.porOrigem ?? [])
    .filter((o) => o.leads > 0)
    .sort((a, b) => b.leads - a.leads)
    .map((o, i) => ({
      rotulo: ROTULO_ORIGEM[o.origem],
      valor: o.leads,
      tom: TONS_ORIGEM[i % TONS_ORIGEM.length]!,
    }));
  const total = fatias.reduce((s, f) => s + f.valor, 0);
  return (
    <PainelGrafico
      titulo="Leads por canal"
      nota="de onde vieram os leads deste mês"
      leitura="Fatias maiores são os canais que mais trazem famílias; confira também quais convertem na etapa ao lado."
      vazio={
        relatorio === null
          ? VAZIO("O relatório")
          : total === 0
            ? "Ainda não há leads neste mês. Quando chegarem, cada canal ganha a sua fatia aqui."
            : undefined
      }
    >
      <Rosca
        rotulo="Leads por canal"
        fatias={fatias}
        espessura={44}
        centro={{
          valor: String(total),
          legenda: total === 1 ? "lead" : "leads",
        }}
      />
    </PainelGrafico>
  );
}

function GraficoFunilMarketing({
  relatorio,
}: {
  relatorio: RelatorioMarketing | null;
}) {
  const t = relatorio?.total;
  return (
    <PainelGrafico
      titulo="Do lead à família ganha"
      nota="o caminho dos leads do mês"
      leitura="Compare cada barra com a anterior: a distância entre elas é onde as famílias ficam pelo caminho."
      vazio={
        relatorio === null
          ? VAZIO("O funil")
          : t && t.leads === 0
            ? "O funil aparece quando houver leads no mês."
            : undefined
      }
    >
      {t ? (
        <BarrasHorizontais
          rotulo="Leads, qualificados e ganhos no mês"
          larguraRotulo="7rem"
          itens={[
            { rotulo: "Leads", valor: t.leads, tom: "dourado" },
            { rotulo: "Qualificados", valor: t.qualificados, tom: "aviso" },
            { rotulo: "Ganhos", valor: t.ganhos, tom: "sucesso" },
          ]}
        />
      ) : null}
    </PainelGrafico>
  );
}
