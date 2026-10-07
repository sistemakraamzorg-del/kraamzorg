"use client";

import * as React from "react";
import { Copy } from "lucide-react";
import { MantaDobrada } from "@/components/ilustracoes";
import { AbasPilula } from "@/components/ui/abas-pilula";
import { Botao } from "@/components/ui/botao";
import { CampoTexto } from "@/components/ui/campo-texto";
import { EstadoVazio } from "@/components/ui/estado-vazio";
import { FaixaAlerta } from "@/components/ui/faixa-alerta";
import { Selo } from "@/components/ui/selo";
import { Colunas } from "@/components/graficos";
import { Card, CardBody, CardHead, Nota } from "@/components/mockup";
import type {
  EstagioPosVenda,
  ListaPosVenda,
  PosVendaItem,
} from "@/lib/dados/tipos-ocorrencia";
import { formatarData, formatarDataHora } from "@/lib/formatacao";
import { nomeMes } from "@/lib/gestao/formato";
import type { SerieNps } from "@/lib/gestao/nps-mensal";
import { cn } from "@/lib/utils";
import {
  Avatar,
  CabecalhoGrafico,
  FaixaResumo,
} from "@/modules/relacao/componentes/faixa-resumo";
import {
  acaoAvancarPosVenda,
  acaoGerarLinkPesquisa,
  acaoMarcarPesquisaEnviada,
} from "../acoes";
import {
  estadoInicialOcorrencia,
  type EstadoAcaoOcorrencia,
} from "../estado-acoes";
import {
  fraseProximoPasso,
  fraseResumoPosVenda,
  ROTULO_CLASSIFICACAO,
  ROTULO_ESTAGIO,
  VARIANTE_ESTAGIO,
} from "../rotulos-pos-venda";

/**
 * Pós-venda, pipeline 4 (P42, PRD 7.4): cada acompanhamento concluído com a
 * pesquisa, a nota e o próximo passo. A pesquisa é enviada pela coordenação,
 * por mensagem pessoal, com um link de uso único; a família responde na
 * página `/pesquisa/<código>`. Família em estado sensível ou que pediu para não
 * ser contatada não recebe pesquisa: o cartão diz isso e some o botão.
 */

function ItemPosVenda({ item }: { item: PosVendaItem }) {
  const [estado, definirEstado] = React.useState<EstadoAcaoOcorrencia>(
    estadoInicialOcorrencia,
  );
  const [ocupado, iniciar] = React.useTransition();
  const [copiado, definirCopiado] = React.useState(false);

  function executar(acao: () => Promise<EstadoAcaoOcorrencia>) {
    definirEstado(estadoInicialOcorrencia);
    definirCopiado(false);
    iniciar(async () => {
      const r = await acao();
      // o texto do link só vive na tela enquanto a pessoa copia; o token nunca é gravado
      definirEstado((antes) => ({ ...r, texto: r.texto ?? antes.texto }));
    });
  }

  async function copiar() {
    if (!estado.texto) return;
    try {
      await navigator.clipboard.writeText(estado.texto);
      definirCopiado(true);
    } catch {
      definirCopiado(false);
    }
  }

  const bloqueada = item.bloqueio !== null;
  const neutra = bloqueada || item.classificacao === "detrator";

  return (
    <div
      className={cn(
        "rounded-2 border-linha bg-superficie flex flex-col gap-3 border p-3",
        bloqueada && "border-sensivel",
      )}
    >
      <div className="flex flex-wrap items-start gap-x-3 gap-y-2">
        <Avatar nome={item.familiaNome} />
        <div className="min-w-0 flex-1">
          <h3 className="font-titulo text-3 text-texto font-medium">
            {item.familiaNome}
          </h3>
          <p className="text-apoio text-texto-2">
            {item.pesquisaRespondidaEm ? (
              <>
                Respondida em{" "}
                <span className="font-mono">
                  {formatarDataHora(item.pesquisaRespondidaEm)}
                </span>
                .
              </>
            ) : item.pesquisaEnviadaEm ? (
              <>
                Enviada em{" "}
                <span className="font-mono">
                  {formatarDataHora(item.pesquisaEnviadaEm)}
                </span>
                {item.pesquisaExpiraEm ? (
                  <>
                    , o link vale até{" "}
                    <span className="font-mono">
                      {formatarData(item.pesquisaExpiraEm)}
                    </span>
                  </>
                ) : null}
                .
              </>
            ) : (
              "Ainda não enviada."
            )}
          </p>
        </div>
        <Selo variante={VARIANTE_ESTAGIO[item.estagio]}>
          {ROTULO_ESTAGIO[item.estagio]}
        </Selo>
      </div>

      {item.nps !== null ? (
        <div
          className={cn(
            "rounded-2 flex flex-col gap-1 px-4 py-3",
            neutra ? "border-linha border" : "bg-superficie",
          )}
        >
          <p className="text-corpo text-texto flex items-baseline gap-1.5">
            Nota{" "}
            <span className="font-titulo text-numero-sm font-medium tabular-nums">
              {item.nps}
            </span>{" "}
            de 10.
          </p>
          <p className="text-apoio text-texto-2">
            {item.classificacao === "detrator"
              ? "A resposta virou uma ocorrência privada da coordenação, com contato pessoal e sem mensagem automática."
              : item.classificacao
                ? `Classificação: ${ROTULO_CLASSIFICACAO[item.classificacao].toLowerCase()}.`
                : ""}
            {item.depoimentoAutorizado === true
              ? " Autorizou o uso do depoimento."
              : ""}
            {item.autorizacaoImagem === true
              ? " Autorizou o uso de imagens."
              : ""}
          </p>
        </div>
      ) : (
        <p className="text-corpo text-texto">
          {fraseProximoPasso(item.estagio)}
        </p>
      )}
      {item.nps !== null ? (
        <p className="text-apoio text-texto-2">
          {fraseProximoPasso(item.estagio)}
        </p>
      ) : null}

      {bloqueada ? (
        <FaixaAlerta
          variante="sensivel"
          titulo={
            item.bloqueio === "freio"
              ? "A pesquisa desta família fica parada"
              : "Esta família pediu para não ser contatada"
          }
        >
          Nenhuma mensagem sai por aqui. Se a coordenação decidir procurar a
          família, o contato é pessoal e pelo nome.
        </FaixaAlerta>
      ) : null}

      {estado.erro ? (
        <FaixaAlerta variante="erro" titulo={estado.erro} />
      ) : null}
      {estado.sucesso ? (
        <FaixaAlerta variante="sucesso" titulo={estado.sucesso} />
      ) : null}
      {estado.texto ? (
        <div className="flex flex-col gap-3">
          <CampoTexto
            rotulo="Texto para a família"
            multilinha
            linhas={5}
            readOnly
            value={estado.texto}
            descricao="O link vale para uma resposta só e não aparece de novo depois que você sair desta tela."
          />
          <div className="flex flex-wrap items-center gap-3">
            <Botao
              className="max-w-full text-balance whitespace-normal"
              variante="secundario"
              tamanho="compacto"
              iconeEsquerda={<Copy className="size-4" aria-hidden="true" />}
              onClick={copiar}
            >
              Copiar o texto
            </Botao>
            {copiado ? (
              <span className="text-apoio text-sucesso">
                Texto copiado. Cole na conversa com a família.
              </span>
            ) : null}
          </div>
        </div>
      ) : null}

      <div className="flex flex-wrap gap-2">
        {item.podeGerarLink && !bloqueada ? (
          <Botao
            className="max-w-full text-balance whitespace-normal"
            variante={
              item.estagio === "pesquisa_enviada" ? "secundario" : "primario"
            }
            tamanho="compacto"
            carregando={ocupado}
            rotuloCarregando="Gerando"
            onClick={() => executar(() => acaoGerarLinkPesquisa(item.id))}
          >
            {item.linkAtivo ? "Gerar um novo link" : "Gerar o link da pesquisa"}
          </Botao>
        ) : null}
        {item.estagio === "protocolo_ultimo_dia_concluido" && item.linkAtivo ? (
          <Botao
            className="max-w-full text-balance whitespace-normal"
            tamanho="compacto"
            carregando={ocupado}
            rotuloCarregando="Marcando"
            onClick={() => executar(() => acaoMarcarPesquisaEnviada(item.id))}
          >
            Marcar como enviada
          </Botao>
        ) : null}
        {item.estagio === "classificado" ||
        item.estagio === "acao_executada" ? (
          <Botao
            className="max-w-full text-balance whitespace-normal"
            tamanho="compacto"
            variante={
              item.estagio === "classificado" ? "primario" : "secundario"
            }
            carregando={ocupado}
            rotuloCarregando="Salvando"
            onClick={() => executar(() => acaoAvancarPosVenda(item.id))}
          >
            {item.estagio === "classificado"
              ? "Marcar a ação como feita"
              : "Arquivar"}
          </Botao>
        ) : null}
      </div>
    </div>
  );
}

const COLUNAS: { id: string; rotulo: string; estagios: EstagioPosVenda[] }[] = [
  {
    id: "enviar",
    rotulo: "Pesquisa a enviar",
    estagios: ["protocolo_ultimo_dia_concluido"],
  },
  {
    id: "aguardando",
    rotulo: "Aguardando resposta",
    estagios: ["pesquisa_enviada"],
  },
  {
    id: "respondidas",
    rotulo: "Respondidas",
    estagios: ["pesquisa_respondida", "classificado"],
  },
  { id: "feita", rotulo: "Ação feita", estagios: ["acao_executada"] },
  { id: "arquivado", rotulo: "Arquivadas", estagios: ["arquivado"] },
];

const PONTO: Record<string, string> = {
  enviar: "bg-dourado",
  aguardando: "bg-aviso",
  respondidas: "bg-marinho",
  feita: "bg-sucesso",
  arquivado: "bg-marinho-50",
};

function VazioGrafico({ children }: { children: React.ReactNode }) {
  return (
    <p className="rounded-2 bg-areia-clara text-corpo text-texto-2 px-4 py-6">
      {children}
    </p>
  );
}

/** `.q`: uma resposta, com filete na lateral pela classificação. Estado sensível usa ameixa, nunca vermelho. */
function RespostaRecente({ item }: { item: PosVendaItem }) {
  const sensivel = item.bloqueio !== null;
  const filete = sensivel
    ? "border-l-sensivel"
    : item.classificacao === "promotor"
      ? "border-l-sucesso"
      : item.classificacao === "detrator"
        ? "border-l-alerta"
        : "border-l-aviso";
  const variante = sensivel
    ? "sensivel"
    : item.classificacao === "promotor"
      ? "sucesso"
      : item.classificacao === "detrator"
        ? "alerta"
        : "aviso";
  return (
    <div
      className={cn(
        "border-linha bg-superficie mb-[9px] rounded-[9px] border border-l-[3px] px-3.5 py-3 last:mb-0",
        filete,
      )}
    >
      <div className="flex flex-wrap items-center gap-x-[9px] gap-y-1">
        <b className="text-[12.5px]">{item.familiaNome}</b>
        <Selo variante={variante}>
          {item.classificacao
            ? ROTULO_CLASSIFICACAO[item.classificacao]
            : "Respondida"}{" "}
          · {item.nps}
        </Selo>
        {item.pesquisaRespondidaEm ? (
          <span className="text-tinta-50 ml-auto font-mono text-[11.5px]">
            {formatarData(item.pesquisaRespondidaEm)}
          </span>
        ) : null}
      </div>
      <div className="mt-[9px] flex flex-wrap gap-1.5">
        {item.depoimentoAutorizado === true ? (
          <Selo variante="sucesso">Depoimento autorizado</Selo>
        ) : null}
        {item.autorizacaoImagem === true ? (
          <Selo variante="sucesso">Imagem autorizada</Selo>
        ) : null}
        {item.classificacao === "detrator" ? (
          <>
            <Selo variante="alerta">Ocorrência privada aberta</Selo>
            <Selo>Sem pedido de avaliação pública</Selo>
          </>
        ) : null}
        <Selo variante="neutro">{ROTULO_ESTAGIO[item.estagio]}</Selo>
      </div>
    </div>
  );
}

/** Linha do NPS por mês (SVG puro, como o gráfico do mockup). Mês sem número fica sem ponto. */
function LinhaNps({
  meses,
}: {
  meses: { rotulo: string; nps: number | null; respostas: number }[];
}) {
  const L = 300;
  const A = 170;
  const e = 22;
  const base = A - 26;
  const x = (k: number) =>
    meses.length === 1 ? L / 2 : e + (k * (L - 2 * e)) / (meses.length - 1);
  const y = (v: number) => base - ((v + 100) / 200) * (base - 14);
  const pontos = meses
    .map((m, k) => (m.nps === null ? null : { k, v: m.nps }))
    .filter((p): p is { k: number; v: number } => p !== null);
  const linha = pontos.map((p) => `${x(p.k)},${y(p.v)}`).join(" ");
  const descricao = meses
    .map(
      (m) =>
        `${m.rotulo}: ${m.nps === null ? (m.respostas === 0 ? "sem respostas" : "poucas respostas") : `NPS ${m.nps}`}`,
    )
    .join("; ");
  return (
    <svg
      viewBox={`0 0 ${L} ${A}`}
      role="img"
      aria-label={`NPS por mês. ${descricao}.`}
      className="h-auto w-full"
    >
      {[-100, 0, 100].map((v) => (
        <g key={v}>
          <line
            x1={e}
            x2={L - e}
            y1={y(v)}
            y2={y(v)}
            stroke="var(--fio-3)"
            strokeWidth="1"
          />
          <text
            x={e - 6}
            y={y(v) + 3}
            textAnchor="end"
            fontSize="9"
            fill="var(--tinta-50)"
          >
            {v}
          </text>
        </g>
      ))}
      {pontos.length > 1 ? (
        <>
          <polygon
            points={`${x(pontos[0]!.k)},${base} ${linha} ${x(pontos[pontos.length - 1]!.k)},${base}`}
            fill="var(--sucesso-vivo)"
            opacity="0.12"
          />
          <polyline
            points={linha}
            fill="none"
            stroke="var(--sucesso-vivo)"
            strokeWidth="2"
          />
        </>
      ) : null}
      {pontos.map((p) => (
        <g key={p.k}>
          <circle cx={x(p.k)} cy={y(p.v)} r="3.5" fill="var(--sucesso-vivo)" />
          <text
            x={x(p.k)}
            y={y(p.v) - 8}
            textAnchor="middle"
            fontSize="10"
            fill="var(--marinho)"
          >
            {p.v}
          </text>
        </g>
      ))}
      {meses.map((m, k) => (
        <text
          key={m.rotulo + k}
          x={x(k)}
          y={A - 8}
          textAnchor="middle"
          fontSize="10"
          fill="var(--tinta-50)"
        >
          {m.rotulo}
        </text>
      ))}
    </svg>
  );
}

export function ListaPosVendaTela({
  lista,
  situacao,
  npsMensal,
}: {
  lista: ListaPosVenda;
  situacao: "abertos" | "todos";
  npsMensal: SerieNps | null;
}) {
  const r = lista.resumo;
  const respondidas = lista.itens.filter((i) => i.nps !== null);
  const enviadas = r.respondidas + r.aguardandoResposta;
  const taxa =
    enviadas === 0 ? null : `${Math.round((100 * r.respondidas) / enviadas)}%`;
  const depoimentos = lista.itens.filter(
    (i) => i.depoimentoAutorizado === true,
  ).length;
  const comImagem = lista.itens.filter(
    (i) => i.autorizacaoImagem === true,
  ).length;
  const distribuicao = [
    ["0 a 6", (n: number) => n <= 6],
    ["7", (n: number) => n === 7],
    ["8", (n: number) => n === 8],
    ["9", (n: number) => n === 9],
    ["10", (n: number) => n === 10],
  ].map(([rotulo, dentro]) => {
    const n = respondidas.filter((i) =>
      (dentro as (n: number) => boolean)(i.nps ?? -1),
    ).length;
    return {
      rotulo: rotulo as string,
      valor: n,
      dica: `Nota ${rotulo}: ${n} ${n === 1 ? "resposta" : "respostas"}`,
    };
  });
  const recentes = [...respondidas]
    .sort((x, y) =>
      (y.pesquisaRespondidaEm ?? "").localeCompare(
        x.pesquisaRespondidaEm ?? "",
      ),
    )
    .slice(0, 5);
  const plural = (n: number, um: string, varios: string) =>
    n === 1 ? um : varios;
  return (
    <div className="flex flex-col gap-6">
      <FaixaResumo
        rotulo="Resumo do pós-venda"
        itens={[
          {
            rotulo: "NPS",
            valor: r.nps === null ? "sem nota" : r.nps,
            contexto:
              r.respondidas === 0
                ? "nenhuma resposta ainda"
                : `${r.promotores} ${plural(r.promotores, "promotor", "promotores")} contra ${r.detratores} ${plural(r.detratores, "detrator", "detratores")}`,
          },
          {
            rotulo: "Taxa de resposta",
            valor: taxa === null ? "sem envio" : taxa,
            contexto:
              enviadas === 0
                ? "nenhuma pesquisa enviada ainda"
                : `${r.respondidas} de ${enviadas} ${plural(enviadas, "família", "famílias")}`,
          },
          {
            rotulo: "Depoimentos coletados",
            valor: depoimentos,
            contexto: `${comImagem} com autorização de imagem`,
          },
          {
            rotulo: "Detratores",
            valor: r.detratores,
            contexto:
              r.detratores === 0
                ? "nenhuma resposta até a nota 6"
                : "ocorrência privada aberta",
          },
        ]}
      />
      <p className="sr-only">{fraseResumoPosVenda(r)}</p>

      <div className="grid grid-cols-1 gap-3.5 lg:grid-cols-3">
        <Card>
          <CardBody>
            <CabecalhoGrafico
              titulo="Distribuição das notas"
              nota="escala 0 a 10"
            />
            {respondidas.length === 0 ? (
              <VazioGrafico>
                Quando a primeira família responder, a distribuição aparece
                aqui.
              </VazioGrafico>
            ) : (
              <Colunas
                rotulo="Distribuição das notas"
                altura={170}
                itens={distribuicao}
              />
            )}
            <p className="text-tinta-50 mt-2.5 flex flex-wrap gap-x-3.5 text-[11px]">
              <span>0 a 6 detrator</span>
              <span>7 e 8 neutro</span>
              <span>9 e 10 promotor</span>
            </p>
          </CardBody>
        </Card>
        <Card>
          <CardBody>
            <CabecalhoGrafico
              titulo="NPS ao longo do tempo"
              nota="evolução mensal"
            />
            {npsMensal === null ? (
              <VazioGrafico>
                Não foi possível ler as respostas agora. Recarregue a página;
                nada foi alterado.
              </VazioGrafico>
            ) : npsMensal.meses.every((m) => m.respostas === 0) ? (
              <VazioGrafico>
                Quando as famílias responderem, o NPS de cada mês aparece aqui.
              </VazioGrafico>
            ) : (
              <LinhaNps
                meses={npsMensal.meses.map((m) => ({
                  rotulo: nomeMes(m.mes).slice(0, 3).toLocaleLowerCase("pt-BR"),
                  nps: m.nps,
                  respostas: m.respostas,
                }))}
              />
            )}
            {npsMensal ? (
              <p className="text-tinta-50 mt-2.5 text-[11px]">
                Mês com menos de {npsMensal.amostraMinima} respostas não mostra
                número.
              </p>
            ) : null}
          </CardBody>
        </Card>
        <Card>
          <CardBody>
            <CabecalhoGrafico
              titulo="Notas por dimensão"
              nota="média de 0 a 10"
            />
            <VazioGrafico>
              A pesquisa de hoje guarda uma nota geral, de 0 a 10. As notas por
              assunto (enfermeira, segurança, amamentação, comunicação e horário
              das visitas) aparecem quando a pesquisa passar a perguntar por
              elas.
            </VazioGrafico>
          </CardBody>
        </Card>
      </div>

      <div className="grid grid-cols-1 items-start gap-3.5 lg:grid-cols-[1fr_340px]">
        <Card>
          <CardHead
            titulo="Respostas recentes"
            direita="a classificação define a ação"
          />
          <CardBody>
            {recentes.length === 0 ? (
              <p className="text-corpo text-texto-2">
                Nenhuma resposta ainda. Quando uma família responder, ela
                aparece aqui com a nota e a ação que vem depois.
              </p>
            ) : (
              recentes.map((i) => <RespostaRecente key={i.id} item={i} />)
            )}
          </CardBody>
        </Card>
        <div className="flex flex-col gap-3.5">
          <Card>
            <CardHead titulo="Ação por nota" />
            <CardBody className="px-4 py-3">
              <ul className="text-tinta-70 text-[11.5px] leading-[1.8]">
                <li className="py-[7px]">
                  <Selo variante="sucesso">9 e 10</Selo> A coordenação agradece,
                  pede o depoimento e convida para indicar.
                </li>
                <li className="border-fio-3 border-t py-[7px]">
                  <Selo variante="aviso">7 e 8</Selo> A coordenação agradece e
                  escuta a família.
                </li>
                <li className="border-fio-3 border-t py-[7px]">
                  <Selo variante="alerta">0 a 6</Selo> Vira ocorrência privada
                  da coordenação, com contato pessoal. Nunca pede avaliação
                  pública.
                </li>
              </ul>
            </CardBody>
          </Card>
          <Card>
            <CardHead titulo="Como a pesquisa chega" />
            <CardBody>
              <p className="text-[11.5px] leading-[1.7]">
                A coordenação gera um link de uso único e manda pela conversa
                pessoal. A família responde na página da pesquisa e a nota entra
                aqui.
              </p>
              <Nota className="mt-3 text-[11.5px]">
                Famílias em estado sensível, ou que pediram para não ser
                contatadas, nunca recebem a pesquisa.
              </Nota>
            </CardBody>
          </Card>
        </div>
      </div>

      <AbasPilula
        rotulo="Filtrar pós-venda"
        ativa={situacao}
        className="self-start"
        abas={[
          { valor: "abertos", rotulo: "Em aberto", href: "/pos-venda" },
          {
            valor: "todos",
            rotulo: "Todos",
            href: "/pos-venda?situacao=todos",
          },
        ]}
      />
      {lista.itens.length === 0 ? (
        <EstadoVazio
          nivelTitulo="h2"
          ilustracao={<MantaDobrada tamanho={112} />}
          titulo="Nenhum pós-venda em andamento"
          texto="Quando uma família terminar o último dia contratado, o pós-venda dela abre aqui. A coordenação gera o link da pesquisa, manda pela conversa pessoal e acompanha a resposta nesta tela."
        />
      ) : (
        <div className="-mx-4 flex snap-x snap-mandatory items-start gap-3 overflow-x-auto px-4 pb-1 lg:mx-0 lg:px-0">
          {COLUNAS.filter(
            (c) => situacao === "todos" || c.id !== "arquivado",
          ).map((c) => {
            const itens = lista.itens.filter((i) =>
              c.estagios.includes(i.estagio),
            );
            return (
              <section
                key={c.id}
                aria-labelledby={`pv-${c.id}`}
                className="rounded-3 border-linha bg-areia-clara flex max-h-[70dvh] w-[19rem] flex-none snap-start flex-col gap-2 border p-2 lg:w-[20rem]"
              >
                <div className="flex min-h-9 flex-none items-center gap-2 pl-1">
                  <span
                    aria-hidden="true"
                    className={cn(
                      "size-2.5 flex-none rounded-full",
                      PONTO[c.id],
                    )}
                  />
                  <h2
                    id={`pv-${c.id}`}
                    className="font-titulo text-3 min-w-0 flex-1 truncate font-medium"
                  >
                    {c.rotulo}
                  </h2>
                  <span className="rounded-pilula bg-superficie text-apoio border-linha inline-flex min-h-8 min-w-8 items-center justify-center border px-2 font-mono font-medium">
                    {itens.length}
                  </span>
                </div>
                {itens.length === 0 ? (
                  <p className="text-apoio text-texto-2 px-2 pb-2">
                    Nenhuma família nesta etapa.
                  </p>
                ) : (
                  <ul className="flex min-h-0 flex-col gap-2 overflow-y-auto overscroll-contain pr-0.5">
                    {itens.map((item) => (
                      <li key={item.id}>
                        <ItemPosVenda item={item} />
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}
