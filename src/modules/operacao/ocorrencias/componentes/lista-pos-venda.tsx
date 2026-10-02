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
import { BarrasHorizontais, Colunas, Rosca } from "@/components/graficos";
import type {
  EstagioPosVenda,
  ListaPosVenda,
  PosVendaItem,
} from "@/lib/dados/tipos-ocorrencia";
import { formatarData, formatarDataHora } from "@/lib/formatacao";
import { nomeMes } from "@/lib/gestao/formato";
import type { SerieNps } from "@/lib/gestao/nps-mensal";
import { cn } from "@/lib/utils";
import { GradeGraficos, PainelGrafico } from "@/modules/inicio/painel-gestao";
import {
  Avatar,
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
  const plural = (n: number, um: string, varios: string) =>
    n === 1 ? um : varios;
  return (
    <div className="flex flex-col gap-6">
      <FaixaResumo
        rotulo="Resumo do pós-venda"
        itens={[
          {
            rotulo: "Famílias no pós-venda",
            valor: lista.itens.length,
            contexto:
              situacao === "abertos"
                ? "em aberto agora. Em Todos entram as arquivadas"
                : `${lista.itens.filter((i) => i.estagio === "arquivado").length} já arquivadas`,
            destaque: true,
          },
          {
            rotulo: "NPS da amostra",
            valor: r.nps === null ? "sem nota" : r.nps,
            contexto:
              r.respondidas === 0
                ? "nenhuma resposta ainda"
                : `${r.promotores} ${plural(r.promotores, "promotor", "promotores")} contra ${r.detratores} ${plural(r.detratores, "detrator", "detratores")}, em ${r.respondidas} ${plural(r.respondidas, "resposta", "respostas")}`,
          },
          {
            rotulo: plural(
              r.aguardandoEnvio,
              "Pesquisa a enviar",
              "Pesquisas a enviar",
            ),
            valor: r.aguardandoEnvio,
            contexto: "a coordenação gera o link e manda",
          },
          {
            rotulo: "Aguardando resposta",
            valor: r.aguardandoResposta,
            contexto:
              r.respondidas === 0
                ? "a família responde pelo link"
                : `${r.respondidas} ${plural(r.respondidas, "já respondeu", "já responderam")}`,
          },
        ]}
      />
      <p className="sr-only">{fraseResumoPosVenda(r)}</p>

      <GradeGraficos colunas={2}>
        <PainelGrafico
          titulo="Classificação das pesquisas"
          nota={`${r.respondidas} ${plural(r.respondidas, "resposta", "respostas")} na amostra`}
          leitura="Promotor nota 9 ou 10, neutro 7 ou 8, detrator até 6."
          vazio={
            r.respondidas === 0
              ? "Quando a primeira família responder, a classificação aparece aqui."
              : undefined
          }
        >
          <Rosca
            rotulo="Classificação das pesquisas"
            centro={{
              valor: r.nps === null ? "sem nota" : String(r.nps),
              legenda: "NPS",
            }}
            fatias={[
              { rotulo: "Promotores", valor: r.promotores, tom: "sucesso" },
              { rotulo: "Neutros", valor: r.neutros, tom: "aviso" },
              { rotulo: "Detratores", valor: r.detratores, tom: "alerta" },
            ]}
          />
        </PainelGrafico>
        <PainelGrafico
          titulo="NPS mês a mês"
          nota="Últimos 6 meses, pelo dia da resposta"
          leitura="NPS é promotores menos detratores, em pontos. Mês com poucas respostas mostra só a contagem."
          vazio={
            npsMensal === null
              ? "Não foi possível ler as respostas agora. Recarregue a página; nada foi alterado."
              : npsMensal.meses.every((m) => m.respostas === 0)
                ? "Quando as famílias responderem, o NPS de cada mês aparece aqui."
                : undefined
          }
        >
          {npsMensal ? (
            <Colunas
              rotulo="NPS por mês"
              altura={150}
              itens={npsMensal.meses.map((m) => ({
                rotulo: nomeMes(m.mes).slice(0, 3),
                valor: m.nps ?? 0,
                valorTexto:
                  m.nps === null
                    ? m.respostas === 0
                      ? "sem respostas"
                      : "poucas respostas"
                    : undefined,
                dica:
                  m.nps === null
                    ? [
                        `${nomeMes(m.mes)}: sem número`,
                        `${m.respostas} de ${npsMensal.amostraMinima} respostas`,
                      ]
                    : [
                        `${nomeMes(m.mes)}: NPS ${m.nps}`,
                        `${m.respostas} ${m.respostas === 1 ? "resposta" : "respostas"}`,
                        `${m.promotores} promotores e ${m.detratores} detratores`,
                      ],
              }))}
            />
          ) : null}
        </PainelGrafico>
        <PainelGrafico
          titulo="Famílias por etapa"
          nota={`${lista.itens.length} ${plural(lista.itens.length, "família", "famílias")} na lista`}
          vazio={
            lista.itens.length === 0
              ? "Sem famílias no pós-venda agora."
              : undefined
          }
        >
          <BarrasHorizontais
            rotulo="Famílias por etapa"
            larguraRotulo="9rem"
            itens={COLUNAS.map((c) => ({
              rotulo: c.rotulo,
              valor: lista.itens.filter((i) => c.estagios.includes(i.estagio))
                .length,
              tom:
                c.id === "feita"
                  ? "sucesso"
                  : c.id === "enviar"
                    ? "dourado"
                    : "marinho",
            }))}
          />
        </PainelGrafico>
      </GradeGraficos>

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
