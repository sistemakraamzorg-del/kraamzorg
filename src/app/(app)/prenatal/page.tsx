import type { Metadata } from "next";
import type { ReactNode } from "react";
import Link from "next/link";
import { ChevronDown } from "lucide-react";
import { Colunas, BarrasHorizontais } from "@/components/graficos";
import { MantaDobrada } from "@/components/ilustracoes";
import { Card, CardBody, CardHead, Kpi } from "@/components/mockup";
import { CabecalhoTela } from "@/components/shell/cabecalho-tela";
import { EstadoVazio } from "@/components/ui/estado-vazio";
import { FaixaAlerta } from "@/components/ui/faixa-alerta";
import { exigirSessao } from "@/lib/auth/sessao";
import { obterRepositorios } from "@/lib/dados/fabrica";
import type { ConsultaPrenatalResumo } from "@/lib/dados/tipos-operacao";
import { formatarDataHora } from "@/lib/formatacao";
import {
  agruparConsultas,
  quemChegouAoAlerta,
} from "@/modules/operacao/prenatal/agrupar";
import { CartaoConsulta } from "@/modules/operacao/prenatal/componentes/cartao-consulta";

export const metadata: Metadata = { title: "Pré-natal · Kraamzorg OS" };

const ROLAGEM =
  "max-h-[28rem] overflow-y-auto pr-1 [scrollbar-width:thin] focus-visible:outline-2 focus-visible:outline-offset-2";

/** Cartão do mockup (`.card`): título no topo, conteúdo embaixo. */
function Bloco({
  titulo,
  direita,
  className,
  children,
}: {
  titulo?: ReactNode;
  direita?: ReactNode;
  className?: string;
  children: ReactNode;
}) {
  return (
    <Card className={`min-w-0 ${className ?? ""}`}>
      {titulo ? <CardHead titulo={titulo} direita={direita} /> : null}
      <CardBody className="flex flex-col gap-4">{children}</CardBody>
    </Card>
  );
}

/** Indicador que leva à seção da lista (a âncora do antigo cartão-resumo). */
function KpiLink({ href, children }: { href?: string; children: ReactNode }) {
  return href ? (
    <Link href={href} className="block min-w-0">
      {children}
    </Link>
  ) : (
    <div className="min-w-0">{children}</div>
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
  className,
  compacta,
}: {
  id: string;
  titulo: string;
  texto?: string;
  consultas: ConsultaPrenatalResumo[];
  className?: string;
  compacta?: boolean;
}) {
  if (consultas.length === 0) return null;
  return (
    <Card id={id} className={`min-w-0 scroll-mt-24 ${className ?? ""}`}>
      <section aria-labelledby={`t-${id}`}>
        <CardHead
          titulo={<span id={`t-${id}`}>{titulo}</span>}
          direita={`${consultas.length} ${consultas.length === 1 ? "família" : "famílias"}`}
        />
        <CardBody className="flex flex-col gap-4">
          {texto ? (
            <p className="text-tinta-50 text-[12.5px]">{texto}</p>
          ) : null}
          <Lista consultas={consultas} compacta={compacta} />
        </CardBody>
      </section>
    </Card>
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
    <Card className="min-w-0 xl:col-span-6">
      <details id="concluidas" className="group scroll-mt-24">
        <summary className="flex min-h-11 cursor-pointer list-none items-center gap-2.5 px-4 py-[13px] focus-visible:outline-2 focus-visible:outline-offset-2 [&::-webkit-details-marker]:hidden">
          <span className="font-titulo flex-1 text-[15.5px] font-normal tracking-[0.01em]">
            Concluídas
            <span className="bg-sucesso-lavado text-sucesso-texto rounded-pilula ml-2 inline-flex min-h-6 min-w-6 items-center justify-center px-2 font-mono text-[11.5px] font-medium tabular-nums">
              {n}
              <span className="sr-only">
                &nbsp;{n === 1 ? "família" : "famílias"}
              </span>
            </span>
          </span>
          <span className="text-tinta-50 flex items-center gap-1 text-[11.5px]">
            <span className="group-open:hidden">Ver concluídas</span>
            <span className="hidden group-open:inline">Esconder</span>
            <ChevronDown
              aria-hidden
              className="size-4 transition-transform group-open:rotate-180"
            />
          </span>
        </summary>
        <CardBody className="border-linha border-t">
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
        </CardBody>
      </details>
    </Card>
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
          <div className="tablet:grid-cols-2 grid grid-cols-1 gap-3.5 xl:grid-cols-6">
            <div className="grid grid-cols-1 gap-3.5 xl:col-span-6 xl:grid-cols-3">
              <KpiLink
                href={
                  grupos.urgentes.length > 0
                    ? "#urgentes"
                    : grupos.paraAgendar.length > 0
                      ? "#para-agendar"
                      : undefined
                }
              >
                <Kpi
                  className="h-full"
                  rotulo={
                    aMarcar === 1
                      ? "Consulta para marcar"
                      : "Consultas para marcar"
                  }
                  valor={aMarcar}
                  delta={
                    grupos.urgentes.length === 0
                      ? "nenhuma urgente"
                      : grupos.urgentes.length === 1
                        ? "1 urgente, contratada perto do parto"
                        : `${grupos.urgentes.length} urgentes, contratadas perto do parto`
                  }
                  tomDelta={grupos.urgentes.length > 0 ? "alerta" : "neutro"}
                />
              </KpiLink>
              <KpiLink
                href={grupos.agendadas.length > 0 ? "#agendadas" : undefined}
              >
                <Kpi
                  className="h-full"
                  rotulo="Marcadas ou em andamento"
                  valor={grupos.agendadas.length}
                  delta={
                    proxima?.agendadaPara
                      ? `a próxima em ${formatarDataHora(proxima.agendadaPara) ?? ""}`
                      : "nenhuma marcada agora"
                  }
                />
              </KpiLink>
              <KpiLink
                href={grupos.concluidas.length > 0 ? "#concluidas" : undefined}
              >
                <Kpi
                  className="h-full"
                  rotulo={
                    grupos.concluidas.length === 1
                      ? "Entrevista concluída"
                      : "Entrevistas concluídas"
                  }
                  valor={grupos.concluidas.length}
                  delta="guardadas na ficha de cada família"
                  tomDelta="ok"
                />
              </KpiLink>
            </div>

            <Bloco titulo="Consultas por estado" className="xl:col-span-3">
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
            <Bloco titulo="Marcadas por semana" className="xl:col-span-3">
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
              className="xl:col-span-6"
            />
            <Secao
              id="para-agendar"
              titulo="Para marcar"
              consultas={grupos.paraAgendar}
              compacta
              className="xl:col-span-3"
            />
            <Secao
              id="agendadas"
              titulo="Marcadas e em andamento"
              consultas={grupos.agendadas}
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
