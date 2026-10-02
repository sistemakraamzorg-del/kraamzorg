"use client";

import * as React from "react";
import { CircleCheck, Plus, Undo2, UserRound } from "lucide-react";
import {
  atribuirTarefaDoQuadro,
  concluirTarefaDoQuadro,
  criarTarefaDoQuadro,
  mudarEstadoTarefaDoQuadro,
} from "@/app/(app)/tarefas-equipe/acoes";
import { XicaraQuente } from "@/components/ilustracoes";
import { Botao } from "@/components/ui/botao";
import { CampoSelecao } from "@/components/ui/campo-selecao";
import { CampoTexto } from "@/components/ui/campo-texto";
import {
  Dialogo,
  DialogoConteudo,
  DialogoFechar,
  DialogoRodape,
} from "@/components/ui/dialogo";
import { EstadoVazio } from "@/components/ui/estado-vazio";
import { FaixaAlerta } from "@/components/ui/faixa-alerta";
import {
  PainelLateral,
  PainelLateralConteudo,
} from "@/components/ui/painel-lateral";
import { Selo } from "@/components/ui/selo";
import type { TarefaEquipe } from "@/lib/dados/tipos-relacao";
import { formatarDataHora } from "@/lib/formatacao";
import { cn } from "@/lib/utils";
import { fraseQuadroEquipes, type EquipeNoQuadro } from "../quadro-equipes";
import { ROTULO_EQUIPE, ROTULO_ORIGEM_TAREFA } from "../rotulos";

/** "30/09, 17:00": dia, mês e hora, sem o ano (a lista é do agora). */
function diaHora(instante: string): string | null {
  const completo = formatarDataHora(instante);
  if (!completo) return null;
  const [data, hora] = completo.split(", ");
  return `${data!.slice(0, 5)}, ${hora}`;
}

type Coluna = "aberta" | "em_andamento" | "concluida";

const COLUNAS: { id: Coluna; rotulo: string; vazio: string }[] = [
  {
    id: "aberta",
    rotulo: "A fazer",
    vazio:
      "Nada esperando começar. Quando uma tarefa nova chegar, ela aparece aqui.",
  },
  {
    id: "em_andamento",
    rotulo: "Em andamento",
    vazio: "Nenhuma tarefa em andamento agora.",
  },
  {
    id: "concluida",
    rotulo: "Concluída",
    vazio:
      "Solte uma tarefa aqui, ou use o botão Concluir, quando ela estiver resolvida.",
  },
];

function SeloPrazo({ tarefa }: { tarefa: TarefaEquipe }) {
  const quando = tarefa.venceEm ? diaHora(tarefa.venceEm) : null;
  if (!quando) return <Selo variante="contorno">Sem prazo</Selo>;
  return tarefa.vencida ? (
    <Selo variante="alerta">Venceu em {quando}</Selo>
  ) : (
    <Selo variante="neutro">Até {quando}</Selo>
  );
}

function SeloPrioridade({ tarefa }: { tarefa: TarefaEquipe }) {
  if (tarefa.prioridade === "normal") return null;
  return (
    <Selo variante={tarefa.prioridade === "maxima" ? "alerta" : "aviso"}>
      {tarefa.prioridade === "maxima" ? "Prioridade máxima" : "Prioridade alta"}
    </Selo>
  );
}

function Linha({
  rotulo,
  children,
}: {
  rotulo: string;
  children: React.ReactNode;
}) {
  return (
    <div className="border-linha flex flex-col gap-1 border-b pb-3 last:border-b-0">
      <dt className="text-mini text-texto-2 font-semibold">{rotulo}</dt>
      <dd className="text-corpo text-texto">{children}</dd>
    </div>
  );
}

function DetalheTarefa({
  tarefa,
  status,
  concluida,
  pendente,
  pessoas,
  aoConcluir,
  aoAtribuir,
}: {
  tarefa: TarefaEquipe;
  status: string;
  concluida: boolean;
  pendente: boolean;
  pessoas: OpcaoPessoa[];
  aoConcluir: () => void;
  aoAtribuir: (responsavelId: string) => void;
}) {
  const quando = tarefa.venceEm ? diaHora(tarefa.venceEm) : null;
  const [novaPessoa, definirNovaPessoa] = React.useState("");
  return (
    <div className="flex flex-col gap-5">
      <dl className="flex flex-col gap-3">
        <Linha rotulo="Responsável">
          {tarefa.responsavel ?? (
            <span className="text-aviso-texto font-semibold">
              Ainda sem responsável
            </span>
          )}
        </Linha>
        <Linha rotulo="Equipe">
          {ROTULO_EQUIPE[tarefa.equipe] ?? tarefa.equipe}
        </Linha>
        <Linha rotulo="Família">
          {tarefa.familia ?? "Não ligada a uma família"}
        </Linha>
        <Linha rotulo="Prazo">
          {quando ? (
            tarefa.vencida && !concluida ? (
              <span className="text-alerta font-semibold">
                Venceu em {quando}
              </span>
            ) : (
              `Até ${quando}`
            )
          ) : (
            "Sem prazo definido"
          )}
        </Linha>
        <Linha rotulo="Por que esta tarefa existe">
          {ROTULO_ORIGEM_TAREFA[tarefa.tipo] ?? ROTULO_ORIGEM_TAREFA.outro}
        </Linha>
        <Linha rotulo="Estado">
          <span className="flex flex-wrap gap-1.5">
            <Selo variante={concluida ? "sucesso" : "neutro"}>
              {concluida
                ? "Concluída"
                : status === "em_andamento"
                  ? "Em andamento"
                  : "A fazer"}
            </Selo>
            <SeloPrioridade tarefa={tarefa} />
          </span>
        </Linha>
      </dl>
      <p className="text-apoio text-texto-2">
        O histórico de quem mexeu na tarefa ainda não aparece nesta tela.
      </p>
      {concluida || pessoas.length === 0 ? null : (
        <div className="flex flex-col gap-2">
          <CampoSelecao
            rotulo="Passar para"
            name="responsavel"
            opcoes={pessoas.map((p) => ({ valor: p.id, rotulo: p.nome }))}
            vazio="Escolha a pessoa"
            value={novaPessoa}
            onChange={(e) => definirNovaPessoa(e.target.value)}
          />
          <Botao
            variante="secundario"
            tamanho="compacto"
            disabled={!novaPessoa || pendente}
            onClick={() => aoAtribuir(novaPessoa)}
            className="self-start"
          >
            Atribuir responsável
          </Botao>
        </div>
      )}
      {concluida ? null : (
        <Botao
          iconeEsquerda={<CircleCheck />}
          carregando={pendente}
          rotuloCarregando="Concluindo"
          onClick={aoConcluir}
          largaTotal
        >
          Concluir tarefa
        </Botao>
      )}
    </div>
  );
}

function CartaoTarefa({
  tarefa,
  concluida,
  emAndamento,
  arrastando,
  aoAbrir,
  aoConcluir,
  aoMudarEstado,
  aoArrastar,
  aoSoltarFora,
}: {
  tarefa: TarefaEquipe;
  concluida: boolean;
  emAndamento: boolean;
  arrastando: boolean;
  aoAbrir: () => void;
  aoConcluir: () => void;
  aoMudarEstado: () => void;
  aoArrastar: () => void;
  aoSoltarFora: () => void;
}) {
  // O título quase sempre já traz a família; repetir só quando não traz.
  const familiaFora =
    tarefa.familia && !tarefa.titulo.includes(tarefa.familia)
      ? tarefa.familia
      : null;
  return (
    <li
      draggable={!concluida}
      onDragStart={(e) => {
        e.dataTransfer.effectAllowed = "move";
        e.dataTransfer.setData("text/plain", tarefa.id);
        aoArrastar();
      }}
      onDragEnd={aoSoltarFora}
      className={cn(
        "rounded-2 border-linha bg-superficie flex flex-col gap-2 border p-3",
        !concluida && "cursor-grab active:cursor-grabbing",
        arrastando && "opacity-50",
      )}
    >
      <button
        type="button"
        onClick={aoAbrir}
        aria-label={`Ver detalhes: ${tarefa.titulo}`}
        className="rounded-1 focus-visible:outline-dourado flex min-h-11 w-full flex-col gap-1.5 text-left focus-visible:outline-2 focus-visible:outline-offset-2"
      >
        <span
          className={cn(
            "text-apoio text-texto leading-snug font-semibold",
            concluida && "text-texto-2 line-through",
          )}
        >
          {tarefa.titulo}
        </span>
        {familiaFora ? (
          <span className="text-mini text-texto-2">{familiaFora}</span>
        ) : null}
        <span className="text-mini text-texto-2 flex items-center gap-1.5">
          <UserRound
            aria-hidden="true"
            className="size-3.5"
            strokeWidth={1.75}
          />
          {tarefa.responsavel ?? "Sem responsável"}
        </span>
      </button>
      <div className="flex flex-wrap items-center gap-1.5">
        {concluida ? (
          <Selo variante="sucesso">Concluída</Selo>
        ) : (
          <>
            <SeloPrazo tarefa={tarefa} />
            <SeloPrioridade tarefa={tarefa} />
          </>
        )}
      </div>
      {concluida ? null : (
        <div className="flex flex-wrap gap-2">
          <Botao
            variante="secundario"
            tamanho="compacto"
            iconeEsquerda={emAndamento ? <Undo2 /> : undefined}
            onClick={aoMudarEstado}
            aria-label={`${emAndamento ? "Voltar para A fazer" : "Começar"}: ${tarefa.titulo}`}
          >
            {emAndamento ? "Voltar para A fazer" : "Começar"}
          </Botao>
          <Botao
            variante="secundario"
            tamanho="compacto"
            iconeEsquerda={<CircleCheck />}
            onClick={aoConcluir}
            aria-label={`Concluir: ${tarefa.titulo}`}
          >
            Concluir
          </Botao>
        </div>
      )}
    </li>
  );
}

export interface OpcaoPessoa {
  id: string;
  nome: string;
}

/**
 * Quadro das tarefas por equipe, em colunas por estado. Arrastar (ou o botão
 * Começar / Voltar para A fazer, que funciona no toque) muda o estado; soltar
 * em Concluída ou o botão Concluir conclui; Nova tarefa e Atribuir
 * responsável abrem pelo diálogo e pelo detalhe. Tudo isso vai pelas funções
 * api da 0046. Se o banco ainda não as tem, a ação volta a tarefa para a
 * coluna de origem e a faixa diz que a atualização precisa ser aplicada.
 */
export function QuadroEquipes({
  quadro,
  pessoas,
  familias,
}: {
  quadro: EquipeNoQuadro[];
  pessoas: OpcaoPessoa[];
  familias: OpcaoPessoa[];
}) {
  const [equipeSel, definirEquipe] = React.useState<string | null>(null);
  const [aberta, definirAberta] = React.useState<string | null>(null);
  const [arrastando, definirArrastando] = React.useState<string | null>(null);
  const [alvo, definirAlvo] = React.useState<Coluna | null>(null);
  const [aviso, definirAviso] = React.useState<{
    erro: boolean;
    texto: string;
  } | null>(null);
  const [concluidas, definirConcluidas] = React.useState<string[]>([]);
  const [emCurso, definirEmCurso] = React.useState<string | null>(null);
  // Estado mostrado antes de o servidor confirmar (arrastar e Começar).
  const [movidas, definirMovidas] = React.useState<Record<string, Coluna>>({});
  const [, iniciar] = React.useTransition();
  const [novaAberta, definirNovaAberta] = React.useState(false);

  // Chegou dado novo do servidor: o otimista cumpriu o papel.
  const [vistos, definirVistos] = React.useState(quadro);
  if (vistos !== quadro) {
    definirVistos(quadro);
    definirConcluidas([]);
    definirMovidas({});
  }

  const equipes = quadro.filter((e) => e.abertas > 0 || e.pessoas.length);
  const visiveis = equipes.filter((e) => !equipeSel || e.equipe === equipeSel);
  const todas = visiveis.flatMap((e) => e.pessoas.flatMap((p) => p.tarefas));
  const concluidas7d = visiveis.reduce(
    (soma, e) => soma + (e.resumo?.concluidas7d ?? 0),
    0,
  );
  const porId = new Map(
    quadro
      .flatMap((e) => e.pessoas.flatMap((p) => p.tarefas))
      .map((t) => [t.id, t]),
  );
  const tarefaAberta = aberta ? (porId.get(aberta) ?? null) : null;
  const colunaDe = (t: TarefaEquipe): Coluna =>
    movidas[t.id] ?? (t.status === "em_andamento" ? "em_andamento" : "aberta");

  function mudarEstado(id: string, coluna: "aberta" | "em_andamento") {
    const tarefa = porId.get(id);
    if (!tarefa || concluidas.includes(id) || colunaDe(tarefa) === coluna)
      return;
    const origem = colunaDe(tarefa);
    definirAviso(null);
    definirMovidas((m) => ({ ...m, [id]: coluna }));
    iniciar(async () => {
      let resultado: { erro?: string };
      try {
        resultado = await mudarEstadoTarefaDoQuadro(id, coluna);
      } catch {
        resultado = { erro: "Sem sinal agora. A tarefa continua onde estava." };
      }
      if (resultado.erro) {
        definirMovidas((m) => ({ ...m, [id]: origem }));
        definirAviso({ erro: true, texto: resultado.erro });
      }
    });
  }

  function atribuir(id: string, responsavelId: string) {
    definirAviso(null);
    definirEmCurso(id);
    iniciar(async () => {
      let resultado: { erro?: string };
      try {
        resultado = await atribuirTarefaDoQuadro(id, responsavelId);
      } catch {
        resultado = { erro: "Sem sinal agora. Nada foi alterado." };
      }
      definirEmCurso(null);
      definirAviso(
        resultado.erro
          ? { erro: true, texto: resultado.erro }
          : { erro: false, texto: "Responsável atualizado." },
      );
    });
  }

  function concluir(id: string) {
    if (concluidas.includes(id)) return;
    definirAviso(null);
    definirEmCurso(id);
    definirConcluidas((c) => [...c, id]);
    iniciar(async () => {
      let resultado: { erro?: string };
      try {
        resultado = await concluirTarefaDoQuadro(id);
      } catch {
        resultado = { erro: "Sem sinal agora. A tarefa continua onde estava." };
      }
      definirEmCurso(null);
      if (resultado.erro) {
        definirConcluidas((c) => c.filter((x) => x !== id));
        definirAviso({ erro: true, texto: resultado.erro });
      } else {
        definirAviso({ erro: false, texto: "Tarefa concluída." });
      }
    });
  }

  function soltar(coluna: Coluna) {
    const id = arrastando;
    definirArrastando(null);
    definirAlvo(null);
    if (!id) return;
    const tarefa = porId.get(id);
    if (!tarefa) return;
    if (coluna === "concluida") return concluir(id);
    mudarEstado(id, coluna);
  }

  return (
    <section aria-label="Tarefas por equipe" className="flex flex-col gap-5">
      <p className="text-3 text-texto max-w-[60ch]">
        {fraseQuadroEquipes(quadro)}
      </p>

      <div className="flex flex-wrap items-center gap-3">
        <Botao iconeEsquerda={<Plus />} onClick={() => definirNovaAberta(true)}>
          Nova tarefa
        </Botao>
      </div>

      {equipes.length > 1 ? (
        <div
          role="group"
          aria-label="Filtrar por equipe"
          className="flex flex-wrap gap-2"
        >
          {[{ equipe: null, rotulo: "Todas as equipes" }, ...equipes].map(
            (e) => {
              const ativo = equipeSel === e.equipe;
              return (
                <button
                  key={e.equipe ?? "todas"}
                  type="button"
                  aria-pressed={ativo}
                  onClick={() => definirEquipe(e.equipe)}
                  className={cn(
                    "rounded-pilula text-apoio focus-visible:outline-dourado min-h-11 border px-4 font-semibold focus-visible:outline-2 focus-visible:outline-offset-2",
                    ativo
                      ? "border-marinho bg-marinho text-texto-inverso"
                      : "border-borda-campo bg-superficie text-texto hover:bg-marinho-08",
                  )}
                >
                  {e.rotulo}
                </button>
              );
            },
          )}
        </div>
      ) : null}

      <div aria-live="polite">
        {aviso ? (
          <FaixaAlerta
            variante={aviso.erro ? "erro" : "sucesso"}
            titulo={aviso.texto}
          />
        ) : null}
      </div>

      {equipes.length === 0 ? (
        <EstadoVazio
          nivelTitulo="h2"
          ilustracao={<XicaraQuente tamanho={104} />}
          titulo="Nenhuma tarefa aberta"
          texto="Quando a régua, uma cadência ou alguém da equipe abrir uma tarefa, ela aparece aqui, com quem cuida e o prazo."
        />
      ) : (
        <div
          role="region"
          aria-label="Colunas por estado. Arraste uma tarefa entre as colunas ou use os botões do cartão."
          tabIndex={0}
          className="-mx-4 flex snap-x snap-mandatory items-start gap-3 overflow-x-auto px-4 pb-3 lg:mx-0 lg:grid lg:grid-cols-3 lg:overflow-visible lg:px-0"
        >
          {COLUNAS.map((coluna) => {
            const doEstado =
              coluna.id === "concluida"
                ? todas.filter((t) => concluidas.includes(t.id))
                : todas.filter(
                    (t) =>
                      !concluidas.includes(t.id) && colunaDe(t) === coluna.id,
                  );
            const destacado = alvo === coluna.id && arrastando !== null;
            const total =
              coluna.id === "concluida"
                ? doEstado.length + concluidas7d
                : doEstado.length;
            return (
              <section
                key={coluna.id}
                aria-labelledby={`coluna-${coluna.id}`}
                onDragOver={(e) => {
                  if (!arrastando) return;
                  e.preventDefault();
                  if (alvo !== coluna.id) definirAlvo(coluna.id);
                }}
                onDragLeave={(e) => {
                  if (!e.currentTarget.contains(e.relatedTarget as Node | null))
                    definirAlvo((a) => (a === coluna.id ? null : a));
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  soltar(coluna.id);
                }}
                className={cn(
                  "rounded-3 bg-areia-clara flex min-h-40 w-[17.5rem] flex-none snap-start flex-col gap-3 border p-3 lg:w-auto",
                  destacado
                    ? "border-dourado bg-dourado-claro"
                    : "border-linha",
                )}
              >
                <div className="flex min-h-10 items-center gap-2 pl-1">
                  <h2
                    id={`coluna-${coluna.id}`}
                    className="font-titulo text-3 min-w-0 flex-1 font-medium"
                  >
                    {coluna.rotulo}
                  </h2>
                  <span className="rounded-pilula bg-superficie text-apoio inline-flex min-h-8 min-w-8 items-center justify-center px-2 font-mono font-medium">
                    {total}
                  </span>
                </div>
                {coluna.id === "concluida" && concluidas7d > 0 ? (
                  <p className="text-apoio text-texto-2 px-1">
                    {concluidas7d === 1
                      ? "1 concluída nos últimos 7 dias."
                      : `${concluidas7d} concluídas nos últimos 7 dias.`}
                  </p>
                ) : null}
                {doEstado.length === 0 &&
                !(coluna.id === "concluida" && concluidas7d > 0) ? (
                  <p className="text-apoio text-texto-2 px-1 pb-2">
                    {destacado ? "Solte aqui." : coluna.vazio}
                  </p>
                ) : null}
                <ul className="flex flex-col gap-2">
                  {doEstado.map((tarefa) => (
                    <CartaoTarefa
                      key={tarefa.id}
                      tarefa={tarefa}
                      concluida={coluna.id === "concluida"}
                      emAndamento={coluna.id === "em_andamento"}
                      arrastando={arrastando === tarefa.id}
                      aoAbrir={() => definirAberta(tarefa.id)}
                      aoConcluir={() => concluir(tarefa.id)}
                      aoMudarEstado={() =>
                        mudarEstado(
                          tarefa.id,
                          coluna.id === "em_andamento"
                            ? "aberta"
                            : "em_andamento",
                        )
                      }
                      aoArrastar={() => {
                        definirAviso(null);
                        definirArrastando(tarefa.id);
                      }}
                      aoSoltarFora={() => {
                        definirArrastando(null);
                        definirAlvo(null);
                      }}
                    />
                  ))}
                </ul>
              </section>
            );
          })}
        </div>
      )}

      <PainelLateral
        open={tarefaAberta !== null}
        onOpenChange={(o) => {
          if (!o) definirAberta(null);
        }}
      >
        {tarefaAberta ? (
          <PainelLateralConteudo
            titulo={tarefaAberta.titulo}
            descricao="Detalhes da tarefa"
            rotuloFechar="Fechar detalhes da tarefa"
          >
            <DetalheTarefa
              tarefa={tarefaAberta}
              status={colunaDe(tarefaAberta)}
              concluida={concluidas.includes(tarefaAberta.id)}
              pendente={emCurso === tarefaAberta.id}
              pessoas={pessoas}
              aoConcluir={() => concluir(tarefaAberta.id)}
              aoAtribuir={(pessoaId) => atribuir(tarefaAberta.id, pessoaId)}
            />
          </PainelLateralConteudo>
        ) : null}
      </PainelLateral>

      <Dialogo open={novaAberta} onOpenChange={definirNovaAberta}>
        <DialogoConteudo
          titulo="Nova tarefa"
          descricao="A tarefa nasce em A fazer. Escolha quem cuida dela agora ou deixe para depois."
          rotuloFechar="Fechar nova tarefa"
        >
          <FormularioNovaTarefa
            pessoas={pessoas}
            familias={familias}
            aoCriada={() => {
              definirNovaAberta(false);
              definirAviso({ erro: false, texto: "Tarefa criada em A fazer." });
            }}
            aoFalhar={(texto) => {
              definirNovaAberta(false);
              definirAviso({ erro: true, texto });
            }}
          />
        </DialogoConteudo>
      </Dialogo>
    </section>
  );
}

function FormularioNovaTarefa({
  pessoas,
  familias,
  aoCriada,
  aoFalhar,
}: {
  pessoas: OpcaoPessoa[];
  familias: OpcaoPessoa[];
  aoCriada: () => void;
  aoFalhar: (texto: string) => void;
}) {
  const [titulo, definirTitulo] = React.useState("");
  const [responsavel, definirResponsavel] = React.useState("");
  const [familia, definirFamilia] = React.useState("");
  const [prazo, definirPrazo] = React.useState("");
  const [erro, definirErro] = React.useState<string | null>(null);
  const [enviando, iniciar] = React.useTransition();

  function enviar(e: React.FormEvent) {
    e.preventDefault();
    if (titulo.trim().length < 3) {
      definirErro("Dê um título à tarefa, com pelo menos 3 letras.");
      return;
    }
    definirErro(null);
    iniciar(async () => {
      let resultado: { erro?: string };
      try {
        resultado = await criarTarefaDoQuadro({
          titulo,
          responsavelId: responsavel,
          familiaId: familia,
          prazo,
        });
      } catch {
        resultado = { erro: "Sem sinal agora. Nada foi salvo." };
      }
      if (resultado.erro) aoFalhar(resultado.erro);
      else aoCriada();
    });
  }

  return (
    <form onSubmit={enviar} className="flex flex-col gap-4" noValidate>
      <CampoTexto
        rotulo="Título"
        name="titulo"
        value={titulo}
        onChange={(e) => definirTitulo(e.target.value)}
        maxLength={120}
        erro={erro}
        autoFocus
      />
      <CampoSelecao
        rotulo="Responsável"
        name="responsavel"
        opcional
        opcoes={pessoas.map((p) => ({ valor: p.id, rotulo: p.nome }))}
        vazio="Sem responsável por enquanto"
        value={responsavel}
        onChange={(e) => definirResponsavel(e.target.value)}
      />
      {familias.length > 0 ? (
        <CampoSelecao
          rotulo="Família"
          name="familia"
          opcional
          opcoes={familias.map((f) => ({ valor: f.id, rotulo: f.nome }))}
          vazio="Não ligada a uma família"
          value={familia}
          onChange={(e) => definirFamilia(e.target.value)}
        />
      ) : null}
      <CampoTexto
        rotulo="Prazo"
        name="prazo"
        type="date"
        opcional
        value={prazo}
        onChange={(e) => definirPrazo(e.target.value)}
      />
      <DialogoRodape>
        <DialogoFechar asChild>
          <Botao type="button" variante="secundario">
            Cancelar
          </Botao>
        </DialogoFechar>
        <Botao type="submit" carregando={enviando} rotuloCarregando="Criando">
          Criar tarefa
        </Botao>
      </DialogoRodape>
    </form>
  );
}
