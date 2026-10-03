import type { Metadata } from "next";
import Link from "next/link";
import { ChevronDown } from "lucide-react";
import { BarrasHorizontais } from "@/components/graficos";
import { Card, CardBody, CardHead, Kpi } from "@/components/mockup";
import { CabecalhoTela } from "@/components/shell/cabecalho-tela";
import { FaixaAlerta } from "@/components/ui/faixa-alerta";
import { exigirSessao } from "@/lib/auth/sessao";
import { ListaTarefas } from "@/modules/mensageria/tarefas/componentes/lista-tarefas";
import {
  listarTarefasTela,
  type TarefasTela,
} from "@/modules/mensageria/tarefas/dados";

export const metadata: Metadata = { title: "Tarefas · Kraamzorg OS" };

/**
 * Como as tarefas funcionam, dito na própria tela (pergunta do dono em
 * 30/09). O que está aqui é o que o sistema já faz (PRD 6.4, 8.3, 10.1 e
 * 23.2): nenhuma regra nova.
 */
const COMO_FUNCIONA: { titulo: string; texto: string }[] = [
  {
    titulo: "De onde vêm",
    texto:
      "Das regras do sistema (a régua de nutrição, o retorno combinado com a família, o freio, o contrato, o pagamento, o fim do acompanhamento, a pesquisa) e de quem da equipe abre uma à mão. Cada tarefa diz de onde veio.",
  },
  {
    titulo: "Quem vê",
    texto:
      "As tarefas que são suas e as do seu papel que ainda não têm responsável.",
  },
  {
    titulo: "Em que ordem",
    texto:
      "Pelo prazo: as vencidas, as que vencem hoje, as dos próximos dias e as sem prazo. Dentro de cada grupo, a prioridade mais alta vem antes.",
  },
  {
    titulo: "Como fecham",
    texto:
      "Com Enviei, depois de mandar o texto pelo WhatsApp; com Concluir, quando é trabalho interno; ou na tela que a tarefa indica, como a ficha ou a proposta. Nada sai para a família sem você tocar em enviar, e o freio da família é conferido antes.",
  },
];

/**
 * Tarefas por prioridade e vencimento (P18 item 2, PRD 23.2). Texto
 * sugerido editável, "Abrir no WhatsApp" e "Enviei" (grava a mensagem com
 * `enviado_por = humano` e conclui a tarefa). Dono: P18. A rota é
 * registrada em `src/lib/navegacao` pela casca (P10).
 */
/** Título de gráfico do mockup (`.chart-h`). */
function TituloGrafico({ nome, nota }: { nome: string; nota: string }) {
  return (
    <div className="mb-3 flex items-baseline gap-[9px]">
      <b className="text-[13px] font-semibold">{nome}</b>
      <span className="text-tinta-50 text-[11px]">{nota}</span>
    </div>
  );
}

export default async function PaginaTarefas() {
  const usuario = await exigirSessao("/tarefas");

  let tela: TarefasTela | null = null;
  try {
    tela = await listarTarefasTela();
  } catch {
    tela = null;
  }

  const contar = (balde: string) =>
    tela?.grupos.find((g) => g.balde === balde)?.tarefas.length ?? 0;
  const vencidas = contar("vencida");
  const hoje = contar("vence_hoje");
  const aVencer = contar("a_vencer");
  const semPrazo = contar("sem_prazo");

  return (
    <>
      <CabecalhoTela
        titulo="Tarefas"
        subtitulo="Agrupadas pelo prazo. Cada tarefa diz por que existe, o que fazer e tem a ação ao lado."
      />
      {/* A página cabe na altura da janela: o que passa disso rola dentro da
          lista (pedido da Camila em 02/10). No celular as colunas empilham e
          a lista rola no próprio cartão. */}
      <div className="flex flex-col gap-3.5 pt-3 lg:h-[calc(100dvh-8.75rem)] lg:min-h-[26rem]">
        {tela ? (
          <>
            <div className="tablet:grid-cols-4 grid flex-none grid-cols-2 gap-3.5">
              <Kpi
                rotulo="Abertas"
                valor={tela.total}
                delta={
                  hoje === 0
                    ? "nenhuma vence hoje"
                    : `${hoje} ${hoje === 1 ? "vence" : "vencem"} hoje`
                }
              />
              <Kpi
                rotulo="Atrasadas"
                valor={vencidas}
                delta={vencidas === 0 ? "nenhuma atrasada" : "prazo já passou"}
                tomDelta={vencidas === 0 ? "ok" : "alerta"}
              />
              <Kpi
                rotulo="Concluídas na semana"
                valor="Sem dado"
                delta="a tarefa ainda não guarda a data de conclusão"
              />
              <Kpi
                rotulo="Criadas por automação"
                valor="Sem dado"
                delta="a tarefa ainda não guarda a origem"
              />
            </div>

            <div className="grid min-h-0 flex-1 grid-cols-1 items-start gap-3.5 lg:grid-cols-[minmax(0,1fr)_340px] lg:items-stretch">
              <Card className="flex max-h-[70dvh] min-h-0 min-w-0 flex-col lg:max-h-none">
                <CardHead titulo="Minhas tarefas" direita={usuario.nome} />
                <div
                  tabIndex={0}
                  aria-label="Lista de tarefas, com rolagem"
                  className="min-h-0 flex-1 overflow-y-auto overscroll-contain focus-visible:outline-2 focus-visible:-outline-offset-2"
                >
                  <ListaTarefas grupos={tela.grupos} detalhada />
                </div>
              </Card>

              <div className="flex min-h-0 min-w-0 flex-col gap-3.5 lg:overflow-y-auto lg:pr-1">
                <Card className="flex-none">
                  <CardBody>
                    <TituloGrafico nome="Tarefas por prazo" nota="abertas" />
                    <BarrasHorizontais
                      rotulo="Tarefas abertas por prazo"
                      larguraRotulo="6.5rem"
                      itens={[
                        { rotulo: "Vencidas", valor: vencidas, tom: "alerta" },
                        { rotulo: "Vencem hoje", valor: hoje, tom: "aviso" },
                        { rotulo: "A vencer", valor: aVencer, tom: "dourado" },
                        { rotulo: "Sem prazo", valor: semPrazo, tom: "areia" },
                      ]}
                    />
                    <p className="text-tinta-50 mt-3 text-[11.5px]">
                      As tarefas de cada pessoa da equipe estão em{" "}
                      <Link
                        href="/tarefas-equipe"
                        className="text-dourado-texto font-medium underline underline-offset-2"
                      >
                        Tarefas por equipe
                      </Link>
                      .
                    </p>
                  </CardBody>
                </Card>
                <Card className="flex-none">
                  <CardBody>
                    <TituloGrafico
                      nome="Origem das tarefas"
                      nota="últimos 30 dias"
                    />
                    <p className="text-tinta-50 text-[12.5px]">
                      A divisão entre tarefas criadas pelo sistema e criadas à
                      mão aparece aqui quando houver histórico de origem.
                    </p>
                  </CardBody>
                </Card>
                <Card className="flex-none">
                  <details className="group">
                    <summary className="flex min-h-11 cursor-pointer list-none items-center gap-2.5 px-4 py-[13px] focus-visible:outline-2 focus-visible:-outline-offset-2 [&::-webkit-details-marker]:hidden">
                      <span className="font-titulo flex-1 text-[15.5px] font-normal tracking-[0.01em]">
                        Como as tarefas funcionam
                      </span>
                      <ChevronDown
                        aria-hidden="true"
                        className="text-tinta-50 size-4 transition-transform group-open:rotate-180"
                      />
                    </summary>
                    <dl className="flex flex-col gap-3 px-4 pb-4">
                      {COMO_FUNCIONA.map((item) => (
                        <div
                          key={item.titulo}
                          className="flex flex-col gap-0.5"
                        >
                          <dt className="text-[12.5px] font-semibold">
                            {item.titulo}
                          </dt>
                          <dd className="text-tinta-50 text-[11.5px] leading-[1.6]">
                            {item.texto}
                          </dd>
                        </div>
                      ))}
                    </dl>
                  </details>
                </Card>
              </div>
            </div>
          </>
        ) : (
          <FaixaAlerta
            variante="prioritario"
            titulo="Não foi possível carregar as tarefas agora"
          >
            Confira a conexão e recarregue a página. Se continuar, avise a
            equipe técnica.
          </FaixaAlerta>
        )}
      </div>
    </>
  );
}
