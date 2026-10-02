import type { Metadata } from "next";
import type { ReactNode } from "react";
import {
  CalendarClock,
  CalendarDays,
  ClipboardCheck,
  ChevronDown,
  ClipboardList,
} from "lucide-react";
import { Colunas, BarrasHorizontais } from "@/components/graficos";
import { TileIcone } from "@/components/ui/tile-icone";
import { MantaDobrada } from "@/components/ilustracoes";
import { CabecalhoTela } from "@/components/shell/cabecalho-tela";
import { CartaoResumo } from "@/components/ui/cartao-resumo";
import type { Tom } from "@/components/ui/tons";
import { EstadoVazio } from "@/components/ui/estado-vazio";
import { FaixaAlerta } from "@/components/ui/faixa-alerta";
import { exigirSessao } from "@/lib/auth/sessao";
import { obterRepositorios } from "@/lib/dados/fabrica";
import type { ConsultaPrenatalResumo } from "@/lib/dados/tipos-operacao";
import { formatarDataHora } from "@/lib/formatacao";
import { TituloSecao } from "@/modules/operacao/comum/titulo-secao";
import {
  agruparConsultas,
  quemChegouAoAlerta,
} from "@/modules/operacao/prenatal/agrupar";
import { CartaoConsulta } from "@/modules/operacao/prenatal/componentes/cartao-consulta";

export const metadata: Metadata = { title: "Pré-natal · Kraamzorg OS" };

const ROLAGEM =
  "max-h-[28rem] overflow-y-auto pr-1 [scrollbar-width:thin] focus-visible:outline-2 focus-visible:outline-offset-2";

/** Bloco do bento: cartão branco com fio fino, título curto e conteúdo. */
function Bloco({
  className,
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  return (
    <div
      className={`border-linha bg-branco rounded-3 flex min-w-0 flex-col gap-4 border p-4 lg:p-5 ${className ?? ""}`}
    >
      {children}
    </div>
  );
}

function Lista({
  consultas,
  compacta = false,
}: {
  consultas: ConsultaPrenatalResumo[];
  compacta?: boolean;
}) {
  return (
    <ul
      tabIndex={0}
      aria-label="Lista com rolagem"
      className={`${ROLAGEM} grid grid-cols-1 gap-3 ${compacta ? "" : "tablet:grid-cols-2"}`}
    >
      {consultas.map((c) => (
        <li key={c.consultaId}>
          <CartaoConsulta consulta={c} />
        </li>
      ))}
    </ul>
  );
}

function Secao({
  id,
  titulo,
  texto,
  consultas,
  icone,
  tom,
  className,
  compacta,
}: {
  id: string;
  titulo: string;
  texto?: string;
  consultas: ConsultaPrenatalResumo[];
  icone: ReactNode;
  tom: Tom;
  className?: string;
  compacta?: boolean;
}) {
  if (consultas.length === 0) return null;
  return (
    <Bloco className={className}>
      <section aria-labelledby={id} className="flex flex-col gap-4">
        <TituloSecao
          id={id}
          icone={icone}
          tom={tom}
          titulo={titulo}
          texto={texto}
          contagem={consultas.length}
          unidade={consultas.length === 1 ? "família" : "famílias"}
        />
        <Lista consultas={consultas} compacta={compacta} />
      </section>
    </Bloco>
  );
}

/** Concluídas: começa recolhida, com a contagem visível. */
function SecaoConcluidas({
  consultas,
}: {
  consultas: ConsultaPrenatalResumo[];
}) {
  if (consultas.length === 0) return null;
  const n = consultas.length;
  return (
    <Bloco className="xl:col-span-6">
      <details id="concluidas" className="group scroll-mt-24">
        <summary className="rounded-2 flex min-h-11 cursor-pointer list-none items-center gap-3 focus-visible:outline-2 focus-visible:outline-offset-2 [&::-webkit-details-marker]:hidden">
          <TileIcone tom="salvia" forma="quadrado">
            <ClipboardCheck />
          </TileIcone>
          <span className="font-titulo text-2 text-texto flex-1 font-medium">
            Concluídas
            <span className="rounded-pilula bg-areia text-apoio text-texto ml-2 inline-flex min-h-7 min-w-7 items-center justify-center px-2 font-mono font-medium tabular-nums">
              {n}
              <span className="sr-only">
                &nbsp;{n === 1 ? "família" : "famílias"}
              </span>
            </span>
          </span>
          <span className="text-apoio text-texto-2 flex items-center gap-1">
            <span className="group-open:hidden">Ver concluídas</span>
            <span className="hidden group-open:inline">Esconder</span>
            <ChevronDown
              aria-hidden
              className="size-4 transition-transform group-open:rotate-180"
            />
          </span>
        </summary>
        <div className="pt-4">
          <ul
            tabIndex={0}
            aria-label="Concluídas, lista com rolagem"
            className={`${ROLAGEM} grid grid-cols-1 gap-2 lg:grid-cols-2`}
          >
            {consultas.map((c) => (
              <li key={c.consultaId}>
                <CartaoConsulta consulta={c} />
              </li>
            ))}
          </ul>
        </div>
      </details>
    </Bloco>
  );
}

/** Marcadas nas próximas 4 semanas (semana 1 = esta, a partir de hoje). */
function marcadasPorSemana(agendadas: ConsultaPrenatalResumo[]) {
  const dia = 24 * 60 * 60 * 1000;
  const agora = Date.now();
  const itens = [0, 1, 2, 3].map((i) => ({
    rotulo: i === 0 ? "Esta" : i === 1 ? "Próxima" : `Em ${i + 1} sem.`,
    valor: 0,
  }));
  let depois = 0;
  for (const c of agendadas) {
    if (!c.agendadaPara) continue;
    const semana = Math.floor(
      (new Date(c.agendadaPara).getTime() - agora) / (7 * dia),
    );
    const alvo = itens[Math.max(semana, 0)];
    if (semana < 4 && alvo) alvo.valor++;
    else depois++;
  }
  return { itens, depois };
}

/**
 * Consultas pré-natais (P35): a entrevista do DOC 1, feita pela
 * coordenação por volta de 34 semanas. Só coordenação e diretoria abrem
 * (o conteúdo é dado assistencial, PRD 13); o comercial vê só o estado, na
 * ficha da família. Urgentes primeiro, depois as que faltam marcar, as
 * marcadas ou em andamento e as concluídas. O aviso das 34 semanas é
 * interno: nada sai para a família.
 */
export default async function PaginaPrenatal() {
  await exigirSessao("/prenatal");

  let consultas: ConsultaPrenatalResumo[] | null = null;
  try {
    const { operacao } = await obterRepositorios();
    consultas = await operacao.listarConsultas();
  } catch {
    consultas = null;
  }

  if (!consultas) {
    return (
      <>
        <CabecalhoTela titulo="Pré-natal" />
        <div className="pt-6">
          <FaixaAlerta variante="erro" titulo="A lista não abriu agora">
            Confira a conexão e recarregue a página. Nenhuma entrevista foi
            alterada.
          </FaixaAlerta>
        </div>
      </>
    );
  }

  const grupos = agruparConsultas(consultas);
  const chegaram = quemChegouAoAlerta(consultas);
  const aMarcar = grupos.urgentes.length + grupos.paraAgendar.length;
  const proxima = grupos.agendadas.find((c) => c.agendadaPara);
  const semanas = marcadasPorSemana(grupos.agendadas);

  return (
    <>
      <CabecalhoTela
        titulo="Pré-natal"
        subtitulo="A entrevista acontece na consulta online, por volta de 34 semanas. Cada resposta fica salva ao sair do campo, e você pode voltar de onde parou."
      />
      <div className="flex flex-col gap-4 pt-6 lg:gap-5">
        {chegaram.length > 0 ? (
          <FaixaAlerta
            variante="prioritario"
            titulo={
              chegaram.length === 1
                ? "1 família chegou às 34 semanas"
                : `${chegaram.length} famílias chegaram às 34 semanas`
            }
            meta="Aviso interno da coordenação. Nada foi enviado às famílias."
          >
            {chegaram.map((c) => c.nome).join(", ")}.
          </FaixaAlerta>
        ) : null}

        {consultas.length === 0 ? (
          <EstadoVazio
            nivelTitulo="h2"
            ilustracao={<MantaDobrada tamanho={112} />}
            titulo="Nenhuma consulta pré-natal por enquanto"
            texto="A consulta nasce quando o pagamento de uma família é confirmado. Ela aparece aqui para marcar e conduzir a entrevista."
          />
        ) : (
          <div className="tablet:grid-cols-2 grid grid-cols-1 gap-4 lg:gap-5 xl:grid-cols-6">
            <CartaoResumo
              destaque
              className="xl:col-span-2"
              tom="dourado"
              icone={<CalendarClock />}
              valor={aMarcar}
              rotulo={
                aMarcar === 1 ? "consulta para marcar" : "consultas para marcar"
              }
              contexto={
                grupos.urgentes.length === 0
                  ? "nenhuma urgente"
                  : grupos.urgentes.length === 1
                    ? "1 urgente, contratada perto do parto"
                    : `${grupos.urgentes.length} urgentes, contratadas perto do parto`
              }
              href={
                grupos.urgentes.length > 0
                  ? "#urgentes"
                  : grupos.paraAgendar.length > 0
                    ? "#para-agendar"
                    : undefined
              }
            />
            <CartaoResumo
              className="xl:col-span-2"
              tom="lavanda"
              icone={<CalendarDays />}
              valor={grupos.agendadas.length}
              rotulo="marcadas ou em andamento"
              contexto={
                proxima?.agendadaPara
                  ? `a próxima em ${formatarDataHora(proxima.agendadaPara) ?? ""}`
                  : "nenhuma marcada agora"
              }
              href={grupos.agendadas.length > 0 ? "#agendadas" : undefined}
            />
            <CartaoResumo
              className="tablet:col-span-2 xl:col-span-2"
              tom="salvia"
              icone={<ClipboardCheck />}
              valor={grupos.concluidas.length}
              rotulo={
                grupos.concluidas.length === 1
                  ? "entrevista concluída"
                  : "entrevistas concluídas"
              }
              contexto="guardadas na ficha de cada família"
              href={grupos.concluidas.length > 0 ? "#concluidas" : undefined}
            />

            <Bloco className="xl:col-span-3">
              <h2 className="font-titulo text-2 text-texto font-medium">
                Consultas por estado
              </h2>
              <BarrasHorizontais
                rotulo="Consultas por estado"
                larguraRotulo="9rem"
                itens={[
                  {
                    rotulo: "Urgentes",
                    valor: grupos.urgentes.length,
                    tom: "alerta",
                  },
                  {
                    rotulo: "Para marcar",
                    valor: grupos.paraAgendar.length,
                    tom: "dourado",
                  },
                  {
                    rotulo: "Marcadas",
                    valor: grupos.agendadas.length,
                    tom: "marinho",
                  },
                  {
                    rotulo: "Concluídas",
                    valor: grupos.concluidas.length,
                    tom: "sucesso",
                  },
                ]}
              />
            </Bloco>
            <Bloco className="xl:col-span-3">
              <h2 className="font-titulo text-2 text-texto font-medium">
                Marcadas por semana
              </h2>
              <Colunas
                rotulo="Consultas marcadas nas próximas semanas"
                altura={110}
                itens={semanas.itens}
              />
              <p className="text-apoio text-texto-2">
                {semanas.depois > 0
                  ? `Mais ${semanas.depois} ${semanas.depois === 1 ? "marcada" : "marcadas"} para depois destas 4 semanas.`
                  : "Considera as próximas 4 semanas a partir de hoje."}
              </p>
            </Bloco>

            <Secao
              id="urgentes"
              titulo="Urgentes"
              texto="Famílias que contrataram perto do parto. Marque estas primeiro."
              consultas={grupos.urgentes}
              icone={<CalendarClock />}
              tom="dourado"
              className="xl:col-span-6"
            />
            <Secao
              id="para-agendar"
              titulo="Para marcar"
              consultas={grupos.paraAgendar}
              icone={<ClipboardList />}
              tom="dourado"
              compacta
              className="xl:col-span-3"
            />
            <Secao
              id="agendadas"
              titulo="Marcadas e em andamento"
              consultas={grupos.agendadas}
              icone={<CalendarDays />}
              tom="lavanda"
              compacta
              className="xl:col-span-3"
            />
            <SecaoConcluidas consultas={grupos.concluidas} />
          </div>
        )}
      </div>
    </>
  );
}
