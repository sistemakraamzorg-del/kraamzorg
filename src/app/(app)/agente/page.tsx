import type { Metadata } from "next";
import Link from "next/link";
import {
  BookOpen,
  ChartColumn,
  ChevronDown,
  Clock3,
  MessageCircle,
  Settings2,
} from "lucide-react";
import { CabecalhoTela } from "@/components/shell/cabecalho-tela";
import { FaixaAlerta } from "@/components/ui/faixa-alerta";
import { exigirSessao } from "@/lib/auth/sessao";
import { Botao } from "@/components/ui/botao";
import {
  GradeIndicadores,
  PainelGrafico,
} from "@/modules/inicio/painel-gestao";
import { Selo } from "@/components/ui/selo";
import { listarConversasTela } from "@/modules/agente/conversas/dados";
import {
  nomeDaConversa,
  quandoNaLista,
} from "@/modules/agente/conversas/lista";
import { rotuloDaSituacao } from "@/modules/agente/formatacao";
import { listarFilaTela } from "@/modules/agente/transferencias/dados";
import type {
  ConversaComPausa,
  TransferenciaTela,
} from "@/modules/agente/tipos";
import { obterBaseConhecimentoTela } from "@/modules/agente/base-conhecimento/dados";
import { PainelBaseConhecimento } from "@/modules/agente/base-conhecimento/componentes/painel-base-conhecimento";
import {
  obterLimiarAmostra,
  obterMetricasTela,
  periodoPadrao,
} from "@/modules/agente/metricas/dados";
import { PainelMetricas } from "@/modules/agente/metricas/componentes/painel-metricas";
import { obterRegraRetomadaTela } from "@/modules/agente/regras-retomada/dados";
import { PainelRegraRetomada } from "@/modules/agente/regras-retomada/componentes/painel-regra-retomada";

export const metadata: Metadata = { title: "Isadora · Kraamzorg OS" };

/** Bloco recolhido: só abre quando a pessoa toca. Nada sai do ar, só fica guardado. */
function Avancado({
  titulo,
  icone,
  children,
}: {
  titulo: string;
  icone: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <details className="group border-linha rounded-3 bg-superficie overflow-hidden border">
      <summary className="focus-visible:outline-foco bg-areia-clara group-open:border-linha flex min-h-11 cursor-pointer list-none items-center gap-3 px-5 py-3 group-open:border-b [&::-webkit-details-marker]:hidden">
        <span className="text-texto-2 [&_svg]:size-5">{icone}</span>
        <span className="font-titulo text-2 text-texto flex-1 font-medium">
          {titulo}
        </span>
        <ChevronDown
          aria-hidden
          className="text-texto-2 size-5 transition-transform group-open:rotate-180"
        />
      </summary>
      <div className="flex flex-col gap-4 p-5">{children}</div>
    </details>
  );
}

/**
 * Tela da Isadora (P27; PRD 11). A primeira dobra é só o que o dia a dia
 * pede: quantas conversas esperam alguém, como estão as conversas e as
 * mais recentes. Retomada, base de conhecimento e números ficam em
 * "Configurações avançadas", recolhidas. [v4.5] O modo, a lista de teste,
 * as pausas e a janela de retomada são parâmetros do agente, mantidos pela
 * equipe de implantação (o app não lê o modo). A pausa e o "devolver à
 * Isadora" ficam na conversa, e a fila de transferências em
 * `/conversas?filtro=esperando`. Dono: P27.
 */
export default async function PaginaAgente() {
  const sessao = await exigirSessao("/agente");
  const ehDiretoria = sessao.papeis.includes("diretoria");

  const [conversasR, filaR] = await Promise.all([
    listarConversasTela().then(
      (v) => ({ ok: true as const, v }),
      () => ({ ok: false as const, v: null as ConversaComPausa[] | null }),
    ),
    listarFilaTela().then(
      (v) => ({ ok: true as const, v }),
      () => ({ ok: false as const, v: null as TransferenciaTela[] | null }),
    ),
  ]);
  const conversas = conversasR.v;
  const fila = filaR.v;
  const contar = (s: ConversaComPausa["situacao"]) =>
    conversas ? conversas.filter((c) => c.situacao === s).length : null;
  const recentes = (conversas ?? [])
    .filter((c) => c.situacao !== "nao_lead")
    .sort((a, b) =>
      (b.ultimaEntradaEm ?? b.ultimaSaidaEm ?? "").localeCompare(
        a.ultimaEntradaEm ?? a.ultimaSaidaEm ?? "",
      ),
    )
    .slice(0, 5);

  const [regraR, baseR, metricasR] = await Promise.all([
    obterRegraRetomadaTela().then(
      (v) => ({ ok: true as const, v }),
      () => ({ ok: false as const, v: null }),
    ),
    obterBaseConhecimentoTela().then(
      (v) => ({ ok: true as const, v }),
      () => ({ ok: false as const, v: null }),
    ),
    (async () => {
      const { desde, ate } = periodoPadrao();
      return obterMetricasTela(desde, ate);
    })().then(
      (v) => ({ ok: true as const, v }),
      () => ({ ok: false as const, v: null }),
    ),
  ]);
  const regra = regraR.v;
  const base = baseR.v;
  const metricas = metricasR.v;
  const esperando = fila ? fila.length : null;

  return (
    <>
      <CabecalhoTela
        sobretitulo="Atendimento"
        titulo="Isadora"
        subtitulo="Quem espera uma resposta da equipe e como estão as conversas."
        lateral={
          <Botao asChild tamanho="compacto">
            <Link href="/conversas?filtro=esperando">Ver quem espera</Link>
          </Botao>
        }
      />
      <div className="flex flex-col gap-6 pt-6">
        {!conversasR.ok || !filaR.ok ? (
          <FaixaAlerta variante="erro" titulo="Alguma parte não carregou agora">
            Confira a conexão e recarregue a página. Se continuar, avise a
            equipe técnica.
          </FaixaAlerta>
        ) : null}

        <section
          aria-labelledby="titulo-situacao"
          className="flex flex-col gap-3"
        >
          <h2 id="titulo-situacao" className="sr-only">
            Situação das conversas
          </h2>
          <div className="[&>ul]:mt-0">
            <GradeIndicadores
              itens={[
                {
                  rotulo: "Esperando a equipe",
                  valor: esperando ?? "sem dado",
                  contexto: "Conversas que pedem uma pessoa da equipe.",
                  href: "/conversas?filtro=esperando",
                  tom: "dourado",
                },
                {
                  rotulo: "Com a Isadora",
                  valor: contar("isadora") ?? "sem dado",
                  contexto: "Conversas que ela está atendendo agora.",
                  href: "/conversas?filtro=isadora",
                  tom: "areia",
                },
                {
                  rotulo: "Com a equipe",
                  valor: contar("equipe") ?? "sem dado",
                  contexto: "Conversas que uma pessoa assumiu.",
                  href: "/conversas?filtro=equipe",
                  tom: "areia",
                },
                {
                  rotulo: "Isadora pausada",
                  valor: contar("pausada") ?? "sem dado",
                  contexto: "Conversas em que ela espera até a pausa acabar.",
                  href: "/conversas?filtro=pausada",
                  tom: "areia",
                },
              ]}
            />
          </div>
          <p className="text-apoio text-texto-2">
            Para pausar a Isadora ou devolver uma conversa a ela, abra a
            conversa e use os botões no alto.
          </p>
        </section>

        <PainelGrafico
          titulo="Conversas recentes"
          nota="As cinco últimas famílias que escreveram."
          vazio={
            recentes.length === 0
              ? conversas
                ? "Ainda não há conversas. Quando uma família escrever, ela aparece aqui."
                : "Não foi possível carregar as conversas agora."
              : undefined
          }
        >
          <ul className="divide-linha -mx-5 -mt-5 divide-y">
            {recentes.map((c) => (
              <li key={c.id}>
                <Link
                  href={`/conversas/${c.id}`}
                  className="focus-visible:outline-foco hover:bg-areia-clara ease-estado flex min-h-11 items-center gap-3 px-5 py-3 no-underline transition-colors duration-140"
                >
                  <MessageCircle
                    aria-hidden
                    className="text-texto-2 size-5 shrink-0"
                  />
                  <span className="text-texto min-w-0 flex-1 truncate font-medium">
                    {nomeDaConversa(c)}
                  </span>
                  <Selo variante="neutro">
                    {rotuloDaSituacao(c.situacao, c.agenteEncerradoMotivo)}
                  </Selo>
                  <span className="text-apoio text-texto-2 w-12 shrink-0 text-right">
                    {quandoNaLista(c.ultimaEntradaEm ?? c.ultimaSaidaEm)}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
          <Link
            href="/conversas"
            className="text-apoio text-texto focus-visible:outline-foco min-h-toque mt-3 inline-flex items-center font-semibold underline decoration-1 underline-offset-4"
          >
            Ver todas as conversas
          </Link>
        </PainelGrafico>

        <section
          aria-labelledby="titulo-avancado"
          className="flex flex-col gap-3"
        >
          <div className="flex flex-col gap-1">
            <h2
              id="titulo-avancado"
              className="font-titulo text-2 text-texto font-medium"
            >
              Configurações avançadas
            </h2>
            <p className="text-apoio text-texto-2">
              Normalmente ficam com a equipe de implantação. Só abra se for
              preciso.
            </p>
          </div>

          <Avancado titulo="Ajustes da Isadora" icone={<Settings2 />}>
            <p className="text-corpo text-texto">
              Quando ela responde, a lista de teste, as pausas, a retomada e a
              agenda são ajustes feitos pela equipe de implantação, fora do
              aplicativo, para a Isadora nunca falar com uma família por um
              número trocado sem querer. Para pedir uma mudança, fale com a
              equipe de implantação.
            </p>
          </Avancado>

          <Avancado
            titulo="Retomada de quem parou de responder"
            icone={<Clock3 />}
          >
            <p className="text-apoio text-texto-2">
              A Isadora manda uma única mensagem de retomada. D+3 e D+14
              continuam como tarefa humana.
            </p>
            {regra ? (
              <PainelRegraRetomada regra={regra} />
            ) : (
              <p className="text-apoio text-texto-2">
                Não foi possível carregar esta regra agora.
              </p>
            )}
          </Avancado>

          <Avancado titulo="Números do mês" icone={<ChartColumn />}>
            <p className="text-apoio text-texto-2">
              Últimos 30 dias, cada número ao lado da meta combinada para os
              primeiros 60 dias.
            </p>
            {metricas ? (
              <PainelMetricas
                metricas={metricas}
                limiarAmostra={await obterLimiarAmostra()}
              />
            ) : (
              <p className="text-apoio text-texto-2">
                Não foi possível carregar as métricas agora.
              </p>
            )}
          </Avancado>

          <Avancado titulo="Base de conhecimento" icone={<BookOpen />}>
            <p className="text-apoio text-texto-2">
              O que a Isadora pode responder. Só o que está aprovado entra na
              próxima atualização.
            </p>
            {base ? (
              <PainelBaseConhecimento base={base} podeAprovar={ehDiretoria} />
            ) : (
              <p className="text-apoio text-texto-2">
                Não foi possível carregar a base agora.
              </p>
            )}
          </Avancado>
        </section>
      </div>
    </>
  );
}
