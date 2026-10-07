"use client";

import * as React from "react";
import Link from "next/link";
import {
  ArrowLeftRight,
  ChevronDown,
  ChevronRight,
  OctagonPause,
  Search,
} from "lucide-react";
import { FolhaLupa } from "@/components/ilustracoes";
import {
  Card,
  classesChip,
  Kpi,
  tabelaMock,
  TituloSecao,
} from "@/components/mockup";
import { Botao } from "@/components/ui/botao";
import { CampoTexto } from "@/components/ui/campo-texto";
import { EstadoVazio } from "@/components/ui/estado-vazio";
import { Selo } from "@/components/ui/selo";
import { localidade } from "@/lib/formatacao";
import { cn } from "@/lib/utils";
import {
  agruparPorFase,
  combinaComBusca,
  contarPorFiltro,
  FILTROS_FASE,
  ORDENS,
  ordenarFamilias,
  pareceTelefone,
  passaNoFiltro,
  TITULO_FASE,
  VAZIO_FILTRO,
  type FaseFamilia,
  type FiltroFase,
  type OrdemFamilias,
} from "../lista-familias";
import type { FamiliaListaTela } from "../tipos";

/**
 * Lista de famílias (pedido do dono em 30/09): filtros em pílula por fase
 * com a contagem, busca que filtra enquanto a pessoa digita, ordem por
 * nome, semanas ou cidade, e as famílias agrupadas pela fase. No
 * computador, linhas com colunas alinhadas; no celular, linhas compactas.
 *
 * A busca por nome, bairro e cidade acontece aqui, sem ir ao servidor e
 * sem gravar o texto na URL. Telefone vai ao servidor (o número não está
 * na lista): o formulário envia `?busca=` como antes.
 */

/** O título da coluna do tempo muda com a fase. */
const COLUNA_TEMPO: Record<FaseFamilia, string> = {
  gestando: "Semanas",
  nasceu: "Nascimento ou alta",
  atendimento: "Atendimento",
  sem_data: "Data",
  freio: "Estado",
};

/** Situação em selo (`.tag` do mockup): uma palavra por fase. */
const SELO_FASE: Record<
  Exclude<FaseFamilia, "freio">,
  { rotulo: string; variante: "sucesso" | "neutro" | "destaque" }
> = {
  gestando: { rotulo: "Gestando", variante: "neutro" },
  nasceu: { rotulo: "Bebê nasceu", variante: "destaque" },
  atendimento: { rotulo: "Em atendimento", variante: "sucesso" },
  sem_data: { rotulo: "Sem data", variante: "neutro" },
};

const ROTULO_FREIO: Record<FamiliaListaTela["estadoSensivel"], string> = {
  normal: "",
  atencao: "Freio em atenção",
  bloqueio_total: "Freio em bloqueio total",
  encerrado_sensivel: "Encerrado sensível",
};

// Classes estáticas (o Tailwind precisa ver a string inteira). A grade imita
// a tabela do mockup: família, cidade, situação, tempo, [estágio, próximo
// passo] e o botão Abrir (78 px, como no `th` dela).
const GRADE_COM_PIPELINE =
  "lg:grid-cols-[minmax(0,2fr)_minmax(0,1.3fr)_minmax(0,1.2fr)_minmax(0,1.1fr)_minmax(0,1fr)_minmax(0,1.5fr)_78px]";
const GRADE_SEM_PIPELINE =
  "lg:grid-cols-[minmax(0,2fr)_minmax(0,1.4fr)_minmax(0,1.3fr)_minmax(0,1.3fr)_78px]";
/** No freio: família, cidade e o estado, sem as colunas do tempo e da venda. */
const GRADE_FREIO =
  "lg:grid-cols-[minmax(0,2fr)_minmax(0,1.3fr)_minmax(0,3.8fr)_78px]";

function gradeDa(fase: FaseFamilia, comPipeline: boolean): string {
  if (fase === "freio") return GRADE_FREIO;
  return comPipeline ? GRADE_COM_PIPELINE : GRADE_SEM_PIPELINE;
}

function Tempo({ familia }: { familia: FamiliaListaTela }) {
  if (!familia.tempo) return null;
  return (
    <span className="inline-flex items-baseline gap-1.5 text-[13px]">
      {familia.tempo.frase ? (
        <span className="text-tinta-50 text-[11.5px]">
          {familia.tempo.frase}
        </span>
      ) : null}
      <span className="font-mono text-[11.5px] tracking-[-0.01em] tabular-nums">
        {familia.tempo.medida}
      </span>
    </span>
  );
}

function ProximoPasso({ familia }: { familia: FamiliaListaTela }) {
  const passo = familia.proximoPasso;
  if (!passo) return null;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 text-[11.5px]",
        passo.tipo === "transferencia" || passo.tipo === "voce"
          ? "text-texto font-medium"
          : passo.tipo === "sem_responsavel"
            ? "text-aviso-texto font-medium"
            : "text-tinta-50",
      )}
    >
      {passo.tipo === "transferencia" ? (
        <ArrowLeftRight
          aria-hidden="true"
          className="size-4 shrink-0"
          strokeWidth={1.75}
        />
      ) : null}
      {passo.frase}
      {passo.data ? (
        <span className="font-mono tabular-nums">{passo.data}</span>
      ) : null}
    </span>
  );
}

function LinhaFamilia({
  familia,
  comPipeline,
}: {
  familia: FamiliaListaTela;
  comPipeline: boolean;
}) {
  const lugar = localidade(familia.bairro, familia.cidade);
  const emFreio = familia.fase === "freio";
  const seloFreio =
    familia.estadoSensivel !== "normal" ? (
      <Selo variante="sensivel" icone={<OctagonPause />}>
        {ROTULO_FREIO[familia.estadoSensivel]}
      </Selo>
    ) : null;
  const seloFase = emFreio
    ? null
    : SELO_FASE[familia.fase as keyof typeof SELO_FASE];
  return (
    <li
      className="border-fio-3 border-b last:border-b-0"
      data-tour="/familias:linha"
    >
      <Link
        href={`/familias/${familia.id}`}
        className={cn(
          "text-texto ease-estado hover:bg-creme-3 flex min-h-16 flex-wrap items-center gap-x-3 gap-y-1 px-4 py-3 no-underline transition-[background-color] duration-140 focus-visible:outline-offset-[-2px] lg:grid lg:min-h-0 lg:gap-x-4 lg:py-[11px]",
          emFreio && "bg-sensivel-lavado hover:bg-sensivel-lavado",
          gradeDa(familia.fase, comPipeline),
        )}
      >
        {/* Família: o nome e, embaixo (`.sm`), o que a equipe precisa saber
            antes de escrever (não contatar, freio em atenção). */}
        <span className="flex min-w-0 basis-full items-start justify-between gap-3 lg:basis-auto">
          <span className="flex min-w-0 flex-col gap-1">
            <span className="text-[13px] leading-snug font-semibold">
              {familia.nome}
            </span>
            {familia.naoContatar || (seloFreio && !emFreio) ? (
              <span className="flex flex-wrap gap-1.5">
                {familia.naoContatar ? (
                  <Selo variante="aviso">Não contatar</Selo>
                ) : null}
                {emFreio ? null : seloFreio}
              </span>
            ) : null}
          </span>
          <ChevronRight
            aria-hidden="true"
            className="text-tinta-50 mt-0.5 size-5 shrink-0 lg:hidden"
            strokeWidth={1.75}
          />
        </span>

        {emFreio ? (
          // Freio puxado: sem semana, sem estágio e sem próximo passo
          // comercial (DESIGN.md, 11.8 e 11.9). Fica onde a família mora, o
          // selo calmo e quem faz o contato.
          <>
            <span className="text-tinta-50 min-w-0 text-[11.5px]">
              {lugar ?? ""}
            </span>
            <span className="flex min-w-0 basis-full flex-wrap items-center gap-x-3 gap-y-1 lg:basis-auto">
              {seloFreio}
              <span className="text-tinta-50 text-[11.5px]">
                Só contato humano, pelo nome.
              </span>
            </span>
          </>
        ) : (
          <>
            <span className="text-tinta-50 min-w-0 text-[11.5px]">
              {lugar ?? ""}
            </span>
            <span className="min-w-0">
              {seloFase ? (
                <Selo variante={seloFase.variante}>{seloFase.rotulo}</Selo>
              ) : null}
            </span>
            <span className="min-w-0">
              <Tempo familia={familia} />
            </span>
            {comPipeline ? (
              <>
                <span aria-hidden="true" className="h-0 basis-full lg:hidden" />
                <span className="min-w-0 text-[11.5px]">
                  {familia.estagio ?? ""}
                </span>
                <span className="min-w-0">
                  <ProximoPasso familia={familia} />
                </span>
              </>
            ) : null}
          </>
        )}

        <span
          aria-hidden="true"
          className={cn(
            classesChip(),
            "hidden w-fit text-[11px] lg:inline-flex",
          )}
        >
          Abrir
        </span>
      </Link>
    </li>
  );
}

function GrupoFase({
  fase,
  familias,
  comPipeline,
}: {
  fase: FaseFamilia;
  familias: FamiliaListaTela[];
  comPipeline: boolean;
}) {
  const idTitulo = `t-familias-${fase}`;
  return (
    <section
      aria-labelledby={idTitulo}
      data-fase={fase}
      className="scroll-mt-4"
    >
      <TituloSecao id={idTitulo} className="mt-0 mb-3 first:mt-0">
        {TITULO_FASE[fase]}
        <span className="text-tinta-50 ml-2 align-middle font-mono text-[12px]">
          <span className="sr-only">, </span>
          {familias.length}
        </span>
      </TituloSecao>
      <Card className="overflow-hidden">
        <div
          aria-hidden="true"
          className={cn(
            tabelaMock.th,
            "hidden gap-x-4 lg:grid",
            gradeDa(fase, comPipeline),
          )}
        >
          <span>Família</span>
          {fase === "freio" ? (
            <>
              <span>Cidade / região</span>
              <span>Estado</span>
            </>
          ) : (
            <>
              <span>Cidade / região</span>
              <span>Situação</span>
              <span>{COLUNA_TEMPO[fase]}</span>
              {comPipeline ? (
                <>
                  <span>Estágio</span>
                  <span>Próximo passo</span>
                </>
              ) : null}
            </>
          )}
          <span>Ficha</span>
        </div>
        <ul>
          {familias.map((familia) => (
            <LinhaFamilia
              key={familia.id}
              familia={familia}
              comPipeline={comPipeline}
            />
          ))}
        </ul>
      </Card>
    </section>
  );
}

export function ListaFamilias({
  familias,
  buscaInicial = "",
  resultadoBusca,
  ordemInicial = "nome",
  truncada = false,
}: {
  /** Todas as famílias que o papel vê (até o limite da lista). */
  familias: FamiliaListaTela[];
  /** O `?busca=` com que a página abriu. */
  buscaInicial?: string;
  /**
   * O que o servidor achou para `buscaInicial` (nome ou telefone, além do
   * limite da lista). Vale enquanto a busca digitada for a mesma.
   */
  resultadoBusca?: FamiliaListaTela[];
  ordemInicial?: OrdemFamilias;
  /** A lista chegou no limite: nem toda família está aqui sem busca. */
  truncada?: boolean;
}) {
  const [consulta, definirConsulta] = React.useState(buscaInicial);
  const [filtro, definirFiltro] = React.useState<FiltroFase>("todas");
  const [ordem, definirOrdem] = React.useState<OrdemFamilias>(ordemInicial);
  const idFormulario = React.useId();

  const comPipeline = familias.some((f) => f.estagio !== null);
  const buscaDoServidor =
    resultadoBusca && consulta.trim() === buscaInicial.trim();

  const achadas = React.useMemo(() => {
    const porTexto = pareceTelefone(consulta)
      ? []
      : familias.filter((f) => combinaComBusca(f, consulta));
    if (!buscaDoServidor) return porTexto;
    const ids = new Set(porTexto.map((f) => f.id));
    return [...porTexto, ...resultadoBusca!.filter((f) => !ids.has(f.id))];
  }, [familias, consulta, buscaDoServidor, resultadoBusca]);

  const contagem = contarPorFiltro(achadas);
  const totais = contarPorFiltro(familias);
  const visiveis = ordenarFamilias(
    achadas.filter((f) => passaNoFiltro(f, filtro)),
    ordem,
  );
  const grupos = agruparPorFase(visiveis);
  const telefonePendente = pareceTelefone(consulta) && !buscaDoServidor;
  const algumFiltro = consulta.trim() !== "" || filtro !== "todas";
  const total = Math.max(familias.length, achadas.length);

  function limpar() {
    definirConsulta("");
    definirFiltro("todas");
  }

  return (
    <div className="flex flex-col gap-[14px]">
      <div
        data-tour="/familias:numeros"
        className="grid grid-cols-2 gap-[14px] lg:grid-cols-4"
      >
        <Kpi rotulo="Famílias cadastradas" valor={total} />
        <Kpi rotulo="Gestando" valor={totais.gestando} />
        <Kpi rotulo="Em atendimento" valor={totais.atendimento} />
        <Kpi rotulo="Com freio" valor={totais.com_freio} />
      </div>

      <form
        id={idFormulario}
        role="search"
        method="get"
        action="/familias"
        data-tour="/familias:busca"
        className="tablet:flex-row tablet:items-end flex flex-col gap-3"
      >
        <CampoTexto
          rotulo="Buscar"
          name="busca"
          type="search"
          value={consulta}
          onChange={(evento) => definirConsulta(evento.target.value)}
          placeholder="Nome, bairro, cidade ou telefone"
          autoComplete="off"
          containerClassName="min-w-0 flex-1"
          acessorio={
            <Search
              aria-hidden="true"
              className="text-texto-2 mr-3 size-4 shrink-0"
            />
          }
        />
        {telefonePendente ? (
          <Botao type="submit" variante="secundario">
            Buscar pelo telefone
          </Botao>
        ) : null}
      </form>

      <div
        data-tour="/familias:filtros"
        className="flex flex-wrap items-center gap-x-[9px] gap-y-2"
      >
        <div
          role="group"
          aria-label="Filtrar pela fase da família"
          className="flex flex-wrap gap-[9px]"
        >
          {FILTROS_FASE.map((item) => {
            const ativo = filtro === item.valor;
            return (
              <button
                key={item.valor}
                type="button"
                aria-pressed={ativo}
                onClick={() => definirFiltro(item.valor)}
                className={cn(
                  classesChip(ativo),
                  "min-h-toque ease-estado cursor-pointer transition-[background-color,color,border-color] duration-140",
                  !ativo && "hover:bg-creme-3",
                )}
              >
                {item.valor === "com_freio" ? (
                  <OctagonPause
                    aria-hidden="true"
                    className="size-4"
                    strokeWidth={1.75}
                  />
                ) : null}
                {item.rotulo}
                <span className="font-mono text-[11px] tabular-nums">
                  <span className="sr-only">, </span>
                  {contagem[item.valor]}
                </span>
              </button>
            );
          })}
        </div>
        {/* A ordem vai junto quando o formulário busca pelo telefone. */}
        <label className="text-tinta-70 ml-auto inline-flex items-center gap-2 text-[12.5px]">
          Ordenar por
          <span className="relative inline-flex">
            <select
              name="ordem"
              form={idFormulario}
              value={ordem}
              onChange={(evento) =>
                definirOrdem(evento.target.value as OrdemFamilias)
              }
              className={cn(
                classesChip(),
                "min-h-toque ease-estado hover:bg-creme-3 cursor-pointer appearance-none pr-9 font-semibold transition-[background-color] duration-140",
              )}
            >
              {ORDENS.map((o) => (
                <option key={o.valor} value={o.valor}>
                  {o.rotulo}
                </option>
              ))}
            </select>
            <ChevronDown
              aria-hidden="true"
              className="text-texto pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2"
              strokeWidth={1.75}
            />
          </span>
        </label>
      </div>

      <p role="status" className="text-tinta-50 max-w-[62ch] text-[11.5px]">
        {telefonePendente
          ? "Para achar pelo telefone, toque em Buscar pelo telefone."
          : visiveis.length === total
            ? `${total} ${total === 1 ? "família" : "famílias"}.`
            : `Mostrando ${visiveis.length} de ${total} famílias.`}
        {truncada && !algumFiltro
          ? " A lista mostra as primeiras em ordem de nome; busque pelo nome ou pelo telefone para achar as outras."
          : ""}
      </p>

      {grupos.length === 0 ? (
        <EstadoVazio
          nivelTitulo="h2"
          ilustracao={<FolhaLupa tamanho={104} />}
          titulo="Nenhuma família nesta busca"
          texto={
            filtro !== "todas" && consulta.trim() === ""
              ? VAZIO_FILTRO[filtro]
              : consulta.trim()
                ? `Nada com "${consulta.trim()}"${filtro !== "todas" ? " neste filtro" : ""}. Confira a grafia, busque pelo bairro ou tente o telefone.`
                : "Nenhuma família nesta lista."
          }
          acao={
            algumFiltro ? (
              <Botao
                type="button"
                variante="secundario"
                tamanho="compacto"
                onClick={limpar}
              >
                Limpar busca e filtros
              </Botao>
            ) : null
          }
        />
      ) : (
        <div className="flex flex-col gap-[26px]">
          {grupos.map((grupo) => (
            <GrupoFase
              key={grupo.fase}
              fase={grupo.fase}
              familias={grupo.familias}
              comPipeline={comPipeline}
            />
          ))}
        </div>
      )}
    </div>
  );
}
