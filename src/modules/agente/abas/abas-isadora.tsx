import Link from "next/link";
import { Botao } from "@/components/ui/botao";
import { Selo } from "@/components/ui/selo";
import {
  Card,
  CardBody,
  CardHead,
  Eyebrow,
  Kpi,
  Nota,
  tabelaMock,
} from "@/components/mockup";
import { BarrasHorizontais, type ItemBarra } from "@/components/graficos";
import { localidade } from "@/lib/formatacao";
import { cn } from "@/lib/utils";
import type { Mensagem } from "@/lib/dados/tipos";
import { horaBrasilia, rotuloDaSituacao } from "../formatacao";
import { nomeDaConversa, quandoNaLista } from "../conversas/lista";
import type { ConversaDetalheTela } from "../conversa-detalhe/dados";
import type { MetricasAgente } from "../tipos";
import { MOTIVOS_SENSIVEIS } from "../tipos";
import type { ConversaComPausa, TransferenciaTela } from "../tipos";
import { PainelMetricas } from "../metricas/componentes/painel-metricas";

/**
 * Abas da tela da Isadora (`v-ia` do HTML da cliente): Conversas, Handoffs,
 * Solicitações, Métricas, Limites e FAQs. Só leitura e navegação: pausar,
 * assumir, devolver à Isadora e reenviar aviso continuam na conversa
 * (`/conversas/[id]`), onde estão as proteções de papel e de freio.
 */

const ROTULO_PRIORIDADE: Record<string, string> = {
  maxima: "Máxima",
  alta: "Alta",
};

function Ponto({ className }: { className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={cn("size-1.5 shrink-0 rounded-full bg-current", className)}
    />
  );
}

function nomeTransferencia(t: TransferenciaTela): string {
  return t.nomeFamilia ?? "Contato sem família";
}

function corDoPonto(c: ConversaComPausa): string {
  if (c.situacao === "freio") return "bg-sensivel";
  const t = c.transferenciaAberta;
  if (t) {
    return MOTIVOS_SENSIVEIS.includes(t.motivo)
      ? "bg-sensivel"
      : t.prioridade === "maxima"
        ? "bg-alerta"
        : "bg-aviso";
  }
  if (c.situacao === "equipe") return "bg-sucesso";
  if (c.situacao === "pausada") return "bg-aviso";
  return "bg-dourado";
}

function BlocoVazio({
  titulo,
  sub,
  texto,
}: {
  titulo: string;
  sub?: string;
  texto: string;
}) {
  return (
    <Card>
      <CardBody>
        <div className="mb-3 flex items-baseline gap-[9px]">
          <b className="text-[13px] font-semibold">{titulo}</b>
          {sub ? (
            <span className="text-tinta-50 text-[11px]">{sub}</span>
          ) : null}
        </div>
        <p className="text-tinta-50 text-[12.5px] leading-[1.6]">{texto}</p>
      </CardBody>
    </Card>
  );
}

// --- Conversas -------------------------------------------------------------

function Bolha({ mensagem, nome }: { mensagem: Mensagem; nome: string }) {
  if (mensagem.tipo === "sistema") {
    return (
      <p className="bg-superficie border-linha text-tinta-50 self-center rounded-[20px] border px-3 py-[3px] text-[10.5px]">
        {mensagem.conteudo}
      </p>
    );
  }
  const daFamilia = mensagem.direcao === "entrada";
  const daIsadora = mensagem.enviadoPor === "ia";
  const daSistema = !daFamilia && mensagem.enviadoPor === "sistema";
  const quem = daFamilia
    ? nome
    : daIsadora
      ? "Isadora (IA)"
      : daSistema
        ? "Resposta automática"
        : "Equipe";
  return (
    <div
      className={cn(
        "max-w-[76%] rounded-[12px] px-3 py-[9px] text-[12.5px] leading-[1.55]",
        daFamilia &&
          "bg-superficie border-linha self-start rounded-bl-[3px] border",
        (daIsadora || daSistema) &&
          "bg-marinho text-texto-inverso self-end rounded-br-[3px]",
        !daFamilia &&
          !daIsadora &&
          !daSistema &&
          "bg-dourado text-marinho self-end rounded-br-[3px]",
      )}
    >
      <div className="mb-[3px] text-[9.5px] font-semibold tracking-[0.1em] uppercase opacity-60">
        {quem}
      </div>
      <p className="whitespace-pre-wrap">
        {mensagem.conteudo ??
          "Chegou um arquivo pelo WhatsApp. Pode conter informação de saúde. Abra com cuidado no WhatsApp."}
      </p>
      <div className="mt-1 text-right font-mono text-[10px] opacity-60">
        {horaBrasilia(mensagem.enviadaEm)}
      </div>
    </div>
  );
}

function ParLinha({
  rotulo,
  children,
}: {
  rotulo: string;
  children: React.ReactNode;
}) {
  return (
    <>
      <dt className="text-tinta-50 text-[11.5px]">{rotulo}</dt>
      <dd className="font-medium">{children}</dd>
    </>
  );
}

export function AbaConversas({
  conversas,
  selecionadaId,
  detalhe,
}: {
  conversas: ConversaComPausa[] | null;
  selecionadaId: string | null;
  detalhe: ConversaDetalheTela | null;
}) {
  const lista = conversas ?? [];
  const t = detalhe?.transferenciaAberta ?? null;
  const c = detalhe?.conversa ?? null;
  const nome = c ? nomeDaConversa(c) : "";
  const ficha = detalhe?.ficha ?? null;
  const mensagens = (detalhe?.mensagens ?? []).slice(-30);
  return (
    <div className="flex flex-col gap-3.5">
      <Card>
        <CardHead
          titulo="Conversas"
          direita="WhatsApp Business API · janela de 24h monitorada"
        />
        <div className="lg:grid lg:h-[520px] lg:grid-cols-[236px_1fr_268px]">
          <nav
            aria-label="Conversas recentes"
            className="border-linha max-h-72 overflow-y-auto border-b lg:max-h-none lg:border-r lg:border-b-0"
          >
            {lista.length === 0 ? (
              <p className="text-tinta-50 p-4 text-[12.5px] leading-[1.6]">
                {conversas
                  ? "Ainda não há conversas. Quando uma família escrever, ela aparece aqui."
                  : "Não foi possível carregar as conversas agora."}
              </p>
            ) : (
              <ul>
                {lista.map((x) => (
                  <li key={x.id}>
                    <Link
                      href={`/agente?aba=conversas&c=${x.id}`}
                      aria-current={x.id === selecionadaId ? "true" : undefined}
                      className={cn(
                        "border-fio-3 hover:bg-creme-3 flex min-h-11 flex-col justify-center border-b px-3.5 py-[11px] no-underline",
                        x.id === selecionadaId && "bg-dourado-lavado",
                      )}
                    >
                      <span className="flex items-center gap-1.5 text-[12.5px] font-semibold">
                        <Ponto className={corDoPonto(x)} />
                        <span className="truncate">{nomeDaConversa(x)}</span>
                        <span className="text-tinta-50 ml-auto font-mono text-[10px] font-normal">
                          {quandoNaLista(x.ultimaEntradaEm ?? x.ultimaSaidaEm)}
                        </span>
                      </span>
                      <span className="text-tinta-50 mt-0.5 truncate text-[11px]">
                        {x.transferenciaAberta
                          ? `Transferência · ${x.transferenciaAberta.motivoRotulo}`
                          : rotuloDaSituacao(
                              x.situacao,
                              x.agenteEncerradoMotivo,
                            )}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </nav>

          <div
            role="region"
            tabIndex={0}
            aria-label="Mensagens da conversa selecionada"
            className="bg-creme-2 flex min-h-[260px] flex-col gap-2.5 overflow-y-auto p-4"
          >
            {c ? (
              mensagens.length === 0 ? (
                <p className="text-tinta-50 self-center text-[12.5px]">
                  Ainda não há mensagens registradas nesta conversa.
                </p>
              ) : (
                mensagens.map((m) => (
                  <Bolha key={m.id} mensagem={m} nome={nome} />
                ))
              )
            ) : (
              <p className="text-tinta-50 self-center text-[12.5px]">
                {lista.length === 0
                  ? "Nenhuma conversa para mostrar."
                  : "Não foi possível abrir esta conversa agora."}
              </p>
            )}
          </div>

          <aside
            aria-label="Detalhes da conversa"
            className="border-linha overflow-y-auto border-t p-3.5 lg:border-t-0 lg:border-l"
          >
            {c ? (
              <>
                <Eyebrow className="mb-[9px] block">Handoff</Eyebrow>
                {t ? (
                  <dl className="mb-3.5 grid grid-cols-[96px_1fr] gap-x-2.5 gap-y-[5px] text-[12.5px]">
                    <ParLinha rotulo="Motivo">{t.motivoRotulo}</ParLinha>
                    <ParLinha rotulo="Prioridade">
                      <Selo
                        variante={
                          MOTIVOS_SENSIVEIS.includes(t.motivo)
                            ? "sensivel"
                            : t.prioridade === "maxima"
                              ? "alerta"
                              : "neutro"
                        }
                      >
                        {ROTULO_PRIORIDADE[t.prioridade] ?? "Normal"}
                      </Selo>
                    </ParLinha>
                    <ParLinha rotulo="Destino">
                      {t.destino === "coordenacao_clinica"
                        ? "Coordenação clínica"
                        : t.destino === "operacao"
                          ? "Operação"
                          : "Comercial"}
                    </ParLinha>
                    <ParLinha rotulo="SLA">
                      {t.slaVenceEm ? (
                        <span className="font-mono">
                          até {horaBrasilia(t.slaVenceEm)}
                        </span>
                      ) : (
                        "sem prazo"
                      )}
                    </ParLinha>
                    <ParLinha rotulo="Assumido">
                      {t.assumidoEm ? (
                        <span className="font-mono">
                          {horaBrasilia(t.assumidoEm)}
                        </span>
                      ) : (
                        "ainda não"
                      )}
                    </ParLinha>
                  </dl>
                ) : (
                  <p className="text-tinta-50 mb-3.5 text-[12.5px]">
                    Nenhuma transferência aberta nesta conversa.
                  </p>
                )}

                <Eyebrow className="mb-[9px] block">Leitura da Isadora</Eyebrow>
                <dl className="mb-3.5 grid grid-cols-[96px_1fr] gap-x-2.5 gap-y-[5px] text-[12.5px]">
                  <ParLinha rotulo="Conversa">
                    {rotuloDaSituacao(c.situacao, c.agenteEncerradoMotivo)}
                  </ParLinha>
                  {ficha?.idadeGestacional ? (
                    <ParLinha rotulo="Semana">
                      <span className="font-mono">
                        {ficha.idadeGestacional}
                      </span>
                    </ParLinha>
                  ) : null}
                  {ficha && localidade(ficha.bairro, ficha.cidade) ? (
                    <ParLinha rotulo="Cidade">
                      {localidade(ficha.bairro, ficha.cidade)}
                    </ParLinha>
                  ) : null}
                  {ficha?.estagioRotulo ? (
                    <ParLinha rotulo="Estágio">{ficha.estagioRotulo}</ParLinha>
                  ) : null}
                </dl>

                {c.situacao === "freio" ? (
                  <Nota tom="sensivel" className="mb-3 text-[11.5px]">
                    Família em cuidado especial. A Isadora está desligada para
                    esta conversa.
                  </Nota>
                ) : c.situacao === "equipe" || t ? (
                  <Nota tom="alerta" className="mb-3 text-[11.5px]">
                    Fluxo comercial com a equipe nesta conversa. A Isadora só
                    volta a atuar se a equipe devolver.
                  </Nota>
                ) : null}

                <Botao asChild tamanho="compacto">
                  <Link href={`/conversas/${c.id}`}>
                    Abrir a conversa e agir
                  </Link>
                </Botao>
              </>
            ) : (
              <p className="text-tinta-50 text-[12.5px]">
                Escolha uma conversa na lista.
              </p>
            )}
          </aside>
        </div>
      </Card>
      <p className="text-tinta-50 text-[11.5px]">
        Para pausar a Isadora, assumir ou devolver uma conversa a ela, abra a
        conversa e use os botões no alto.
      </p>
    </div>
  );
}

// --- Handoffs --------------------------------------------------------------

export function AbaHandoffs({ fila }: { fila: TransferenciaTela[] | null }) {
  const lista = fila ?? [];
  const porMotivo = new Map<string, ItemBarra>();
  for (const t of lista) {
    const atual = porMotivo.get(t.motivo);
    if (atual) atual.valor += 1;
    else
      porMotivo.set(t.motivo, {
        rotulo: t.motivoRotulo,
        valor: 1,
        tom: MOTIVOS_SENSIVEIS.includes(t.motivo)
          ? "sensivel"
          : t.prioridade === "maxima"
            ? "alerta"
            : "dourado",
      });
  }
  const itens = [...porMotivo.values()].sort((a, b) => b.valor - a.valor);
  return (
    <div className="flex flex-col gap-3.5">
      <div className="grid grid-cols-1 gap-3.5 lg:grid-cols-2">
        <Card>
          <CardBody>
            <div className="mb-3 flex items-baseline gap-[9px]">
              <b className="text-[13px] font-semibold">Handoffs por motivo</b>
              <span className="text-tinta-50 text-[11px]">abertos agora</span>
            </div>
            {itens.length > 0 ? (
              <BarrasHorizontais
                itens={itens}
                rotulo="Transferências abertas por motivo"
                larguraRotulo="9.5rem"
              />
            ) : (
              <p className="text-tinta-50 text-[12.5px] leading-[1.6]">
                {fila
                  ? "Nenhuma transferência aberta agora."
                  : "Não foi possível carregar as transferências agora."}
              </p>
            )}
          </CardBody>
        </Card>
        <BlocoVazio
          titulo="Tempo até assumir"
          sub="minutos, por prioridade"
          texto="O app ainda não guarda o histórico de quanto tempo cada transferência levou para ser assumida. Quando esse registro existir, a comparação com o prazo aparece aqui."
        />
      </div>

      <Card>
        <CardHead
          titulo="Fila de handoff"
          direita={
            fila
              ? `${lista.length} ${lista.length === 1 ? "aberto" : "abertos"}`
              : undefined
          }
        />
        <div className="overflow-x-auto">
          <table className={tabelaMock.tabela}>
            <thead>
              <tr>
                {[
                  "Família",
                  "Motivo",
                  "Destino",
                  "Aberto",
                  "SLA",
                  "Situação",
                ].map((h) => (
                  <th key={h} className={tabelaMock.th}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {lista.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className={cn(tabelaMock.td, "text-tinta-50")}
                  >
                    {fila
                      ? "Nenhuma conversa esperando a equipe. A Isadora continua a triagem e avisa aqui quando alguém quiser contratar, marcar a conversa ou falar com uma pessoa."
                      : "Não foi possível carregar a fila agora."}
                  </td>
                </tr>
              ) : (
                lista.map((t) => {
                  const sensivel = MOTIVOS_SENSIVEIS.includes(t.motivo);
                  return (
                    <tr key={t.id} className={tabelaMock.tr}>
                      <td className={cn(tabelaMock.td, tabelaMock.nome)}>
                        <Link
                          href={
                            t.conversaId
                              ? `/conversas/${t.conversaId}`
                              : `/conversas/transferencia/${t.id}`
                          }
                          className="focus-visible:outline-foco inline-flex min-h-11 items-center no-underline lg:min-h-0"
                        >
                          {nomeTransferencia(t)}
                        </Link>
                      </td>
                      <td className={cn(tabelaMock.td, tabelaMock.sub)}>
                        {t.motivoRotulo}
                      </td>
                      <td className={cn(tabelaMock.td, tabelaMock.sub)}>
                        {t.destino === "coordenacao_clinica"
                          ? "Coordenação clínica"
                          : t.destino === "operacao"
                            ? "Operação"
                            : "Comercial"}
                      </td>
                      <td
                        className={cn(tabelaMock.td, "font-mono text-[12px]")}
                      >
                        {horaBrasilia(t.criadoEm)}
                      </td>
                      <td
                        className={cn(tabelaMock.td, "font-mono text-[12px]")}
                      >
                        {t.slaVenceEm
                          ? horaBrasilia(t.slaVenceEm)
                          : "sem prazo"}
                      </td>
                      <td className={tabelaMock.td}>
                        <Selo
                          variante={
                            t.pausaVenceu
                              ? "alerta"
                              : t.status === "assumido"
                                ? "sucesso"
                                : sensivel
                                  ? "sensivel"
                                  : "aviso"
                          }
                          icone={<Ponto />}
                        >
                          {t.pausaVenceu
                            ? "Pausa venceu"
                            : t.status === "assumido"
                              ? "Assumido"
                              : "Aguardando"}
                        </Selo>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
        <CardBody className="border-linha border-t">
          <div className="flex flex-wrap items-center gap-[7px] text-[11.5px]">
            {["Isadora", "Comercial", "Operação", "Coordenação clínica"].map(
              (e, i) => (
                <span key={e} className="contents">
                  {i > 0 ? (
                    <span aria-hidden="true" className="text-tinta-30">
                      →
                    </span>
                  ) : null}
                  <span className="bg-superficie border-fio-2 rounded-[6px] border px-[9px] py-[5px] font-mono text-[10.5px]">
                    {e}
                  </span>
                </span>
              ),
            )}
          </div>
          <div className="mt-3">
            <Botao asChild tamanho="compacto">
              <Link href="/conversas?filtro=esperando">Ver quem espera</Link>
            </Botao>
          </div>
        </CardBody>
      </Card>
    </div>
  );
}

// --- Solicitações ----------------------------------------------------------

export function AbaSolicitacoes() {
  return (
    <div className="flex flex-col gap-3.5">
      <Nota>
        <b>
          Solicitações são o que a Isadora pede ao sistema, não o que ela
          responde.
        </b>{" "}
        Cada ação com efeito real passa por aqui e pode exigir aprovação humana
        conforme a configuração.
      </Nota>
      <Card>
        <div className="overflow-x-auto">
          <table className={tabelaMock.tabela}>
            <thead>
              <tr>
                {[
                  "Solicitação",
                  "Família",
                  "Origem",
                  "Efeito",
                  "Hora",
                  "Situação",
                ].map((h) => (
                  <th key={h} className={tabelaMock.th}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              <tr>
                <td colSpan={6} className={cn(tabelaMock.td, "text-tinta-50")}>
                  O app ainda não registra as solicitações da Isadora. Quando o
                  registro existir, cada pedido aparece aqui com a hora e a
                  situação. Por enquanto, as transferências para a equipe estão
                  na aba Handoffs.
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

// --- Métricas --------------------------------------------------------------

export function AbaMetricas({
  contadores,
  metricas,
  limiarAmostra,
}: {
  contadores: {
    esperando: number | null;
    isadora: number | null;
    equipe: number | null;
    pausada: number | null;
  };
  metricas: MetricasAgente | null;
  limiarAmostra: number | null;
}) {
  const itens = [
    {
      rotulo: "Esperando a equipe",
      valor: contadores.esperando,
      filtro: "esperando",
      sub: "pedem uma pessoa",
    },
    {
      rotulo: "Com a Isadora",
      valor: contadores.isadora,
      filtro: "isadora",
      sub: "atendendo agora",
    },
    {
      rotulo: "Com a equipe",
      valor: contadores.equipe,
      filtro: "equipe",
      sub: "uma pessoa assumiu",
    },
    {
      rotulo: "Isadora pausada",
      valor: contadores.pausada,
      filtro: "pausada",
      sub: "esperam a pausa acabar",
    },
  ];
  return (
    <div className="flex flex-col gap-3.5">
      <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-4">
        {itens.map((i) => (
          <Link
            key={i.filtro}
            href={`/conversas?filtro=${i.filtro}`}
            className="focus-visible:outline-foco rounded-3 block no-underline"
          >
            <Kpi
              rotulo={i.rotulo}
              valor={i.valor ?? "sem dado"}
              delta={i.sub}
              className="h-full"
            />
          </Link>
        ))}
      </div>

      <Card>
        <CardHead
          titulo="Números do mês"
          direita="últimos 30 dias, ao lado da meta dos primeiros 60 dias"
        />
        <CardBody>
          {metricas ? (
            <PainelMetricas metricas={metricas} limiarAmostra={limiarAmostra} />
          ) : (
            <p className="text-tinta-50 text-[12.5px]">
              Não foi possível carregar as métricas agora.
            </p>
          )}
        </CardBody>
      </Card>

      <div className="grid grid-cols-1 gap-3.5 lg:grid-cols-2">
        <BlocoVazio
          titulo="Volume de conversas"
          sub="por semana, quem inicia"
          texto="Sem série semanal por enquanto. O app ainda não guarda quem iniciou cada conversa."
        />
        <BlocoVazio
          titulo="Resolução sem humano"
          sub="evolução"
          texto="Sem série mensal por enquanto. Aparece quando houver meses fechados com e sem transferência."
        />
      </div>
      <div className="grid grid-cols-1 gap-3.5 lg:grid-cols-3">
        <BlocoVazio
          titulo="Horário das conversas"
          sub="quando a família procura"
          texto="Sem distribuição por horário por enquanto."
        />
        <BlocoVazio
          titulo="FAQs mais acionadas"
          sub="no mês"
          texto="O app ainda não conta quantas vezes cada resposta da base foi usada."
        />
        <BlocoVazio
          titulo="Custo por conversa"
          sub="WhatsApp API"
          texto="O custo das conversas ainda não chega ao app."
        />
      </div>
    </div>
  );
}

// --- Limites e FAQs --------------------------------------------------------

const LIMITES_FIXOS = [
  "Interpretar sintomas ou orientar conduta clínica",
  "Criar desconto ou condição fora da tabela vigente",
  "Afirmar disponibilidade sem consultar a capacidade",
  "Prometer resultado de amamentação, sono ou recuperação",
  "Criar urgência artificial",
] as const;

export function AbaLimites({
  ajustes,
  retomada,
  base,
}: {
  ajustes: React.ReactNode;
  retomada: React.ReactNode;
  base: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-3.5">
      <div className="grid grid-cols-1 gap-3.5 lg:grid-cols-2">
        <Card>
          <CardHead
            titulo="Limites da Isadora"
            direita="regras fixas do agente"
          />
          <CardBody>
            <p className="text-tinta-50 mb-3 text-[11.5px]">
              O que está bloqueado aqui está bloqueado no sistema. Não é
              instrução de texto, é regra.
            </p>
            <ul className="flex flex-col gap-2">
              {LIMITES_FIXOS.map((l) => (
                <li
                  key={l}
                  className="flex items-center gap-[9px] text-[12.5px]"
                >
                  <Selo variante="alerta" className="min-w-16 justify-center">
                    Bloqueado
                  </Selo>
                  {l}
                </li>
              ))}
              <li className="flex items-center gap-[9px] text-[12.5px]">
                <Selo variante="sucesso" className="min-w-16 justify-center">
                  Ativo
                </Selo>
                Responder apenas com o conteúdo aprovado na base
              </li>
            </ul>
          </CardBody>
        </Card>
        <Card>
          <CardHead
            titulo="Termos de alerta"
            direita="encerram o fluxo comercial na hora"
          />
          <CardBody>
            <p className="text-tinta-50 mb-3 text-[11.5px] leading-[1.7]">
              A lista é definida pela coordenação clínica da Kraamzorg. O
              sistema apenas executa; quem escreve a lista é quem entende de
              obstetrícia. Ela fica com a equipe de implantação e não é exibida
              neste aplicativo.
            </p>
            <Nota tom="sensivel" className="text-[11.5px]">
              Termos ligados a perda gestacional acionam também o estado
              sensível da família, congelando todas as réguas antes de qualquer
              pessoa ser notificada.
            </Nota>
          </CardBody>
        </Card>
      </div>

      <Card>
        <CardHead
          titulo="Base de conhecimento"
          direita="só o aprovado entra na próxima atualização"
        />
        <CardBody>{base}</CardBody>
      </Card>
      <Card>
        <CardHead titulo="Retomada de quem parou de responder" />
        <CardBody>{retomada}</CardBody>
      </Card>
      <Card>
        <CardHead
          titulo="Ajustes da Isadora"
          direita="com a equipe de implantação"
        />
        <CardBody>{ajustes}</CardBody>
      </Card>
    </div>
  );
}
