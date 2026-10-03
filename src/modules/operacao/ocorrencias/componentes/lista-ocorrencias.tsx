import * as React from "react";
import Link from "next/link";
import { LockKeyhole } from "lucide-react";
import { Rosca, type FatiaRosca, type TomGrafico } from "@/components/graficos";
import { FolhaLupa, SinoCalmo } from "@/components/ilustracoes";
import {
  Card,
  CardBody,
  CardHead,
  Kpi,
  Nota,
  tabelaMock,
} from "@/components/mockup";
import { AbasPilula } from "@/components/ui/abas-pilula";
import { EstadoVazio } from "@/components/ui/estado-vazio";
import { Selo } from "@/components/ui/selo";
import type {
  ListaOcorrencias,
  OcorrenciaResumo,
  SituacaoOcorrencias,
  TipoOcorrencia,
} from "@/lib/dados/tipos-ocorrencia";
import { formatarDataHora } from "@/lib/formatacao";
import { cn } from "@/lib/utils";
import {
  grupoDaOcorrencia,
  prazoDaOcorrencia,
  type PrazoTela,
  type SituacaoGrupo,
} from "../prazo";
import {
  ORDEM_STATUS,
  ROTULO_PRIORIDADE,
  ROTULO_STATUS,
  ROTULO_TIPO,
  VARIANTE_PRIORIDADE,
  VARIANTE_STATUS,
} from "../rotulos";

function plural(n: number, um: string, varios: string): string {
  return `${n} ${n === 1 ? um : varios}`;
}

/** Frase do resumo, lida pelo leitor de tela e usada nos testes. */
export function fraseResumoOcorrencias(
  resumo: ListaOcorrencias["resumo"],
): string {
  if (resumo.abertas === 0) return "Nenhuma ocorrência aberta agora.";
  const partes = [
    `${plural(resumo.abertas, "ocorrência aberta", "ocorrências abertas")}.`,
  ];
  if (resumo.vencidas > 0) {
    partes.push(
      `${plural(resumo.vencidas, "passou", "passaram")} do prazo de resposta.`,
    );
  }
  if (resumo.privadas > 0) {
    partes.push(
      `${plural(resumo.privadas, "é privada", "são privadas")}, só da coordenação.`,
    );
  }
  return partes.join(" ");
}

const GRUPOS: Record<SituacaoGrupo, { titulo: string; apoio: string }> = {
  vencidas: {
    titulo: "Passaram do prazo",
    apoio: "Responda estas primeiro",
  },
  no_prazo: {
    titulo: "Dentro do prazo",
    apoio: "por prioridade e prazo",
  },
  fechadas: {
    titulo: "Fechadas",
    apoio: "histórico guardado",
  },
};

const ORDEM_GRUPOS: SituacaoGrupo[] = ["vencidas", "no_prazo", "fechadas"];

const COR_PRAZO: Record<PrazoTela["tom"], string> = {
  alerta: "text-alerta",
  aviso: "text-aviso-texto",
  neutro: "text-tinta-50",
  sensivel: "text-sensivel",
};

const TOM_TIPO: Record<TipoOcorrencia, TomGrafico> = {
  intercorrencia: "sensivel",
  contato_perdido: "dourado",
  registro_atrasado: "aviso",
  capacidade: "marinho",
  experiencia: "areia",
  reclamacao: "alerta",
  detrator: "azul",
  outro: "lavanda",
};

/** Intercorrência e privada ganham o fundo lavado de estado sensível. */
const ehSensivel = (o: OcorrenciaResumo) =>
  o.tipo === "intercorrencia" || o.privada;

function SeloPrivada() {
  return (
    <Selo variante="sensivel" icone={<LockKeyhole />} className="self-start">
      Privada, só coordenação e diretoria
    </Selo>
  );
}

function Responsavel({ o }: { o: OcorrenciaResumo }) {
  return o.responsavelNome ? (
    <span className="text-tinta-70">{o.responsavelNome}</span>
  ) : (
    <span className="text-aviso-texto font-semibold">Sem responsável</span>
  );
}

function Situacao({ o, agora }: { o: OcorrenciaResumo; agora: Date }) {
  const prazo = prazoDaOcorrencia(o, agora);
  return (
    <div className="flex flex-col items-start gap-1">
      <Selo variante={VARIANTE_STATUS[o.status]}>
        {ROTULO_STATUS[o.status]}
      </Selo>
      <span className={cn("text-[11.5px] font-semibold", COR_PRAZO[prazo.tom])}>
        {prazo.frase}
      </span>
    </div>
  );
}

function Prioridade({ o }: { o: OcorrenciaResumo }) {
  // Intercorrência sem âmbar e sem vermelho (DESIGN.md, 11.8).
  return (
    <Selo
      variante={
        o.tipo === "intercorrencia"
          ? "sensivel"
          : VARIANTE_PRIORIDADE[o.prioridade]
      }
    >
      {ROTULO_PRIORIDADE[o.prioridade]}
    </Selo>
  );
}

function Titulo({ o }: { o: OcorrenciaResumo }) {
  const quem = o.familiaNome ?? o.profissionalNome;
  return (
    <>
      <Link
        href={`/ocorrencias/${o.id}`}
        className={cn(
          tabelaMock.nome,
          "inline-flex min-h-11 items-center underline-offset-4 hover:underline md:min-h-0",
        )}
      >
        {o.titulo}
      </Link>
      <div className={tabelaMock.sub}>{quem ?? "Sem família"}</div>
    </>
  );
}

function GrupoTabela({
  grupo,
  itens,
  agora,
}: {
  grupo: SituacaoGrupo;
  itens: OcorrenciaResumo[];
  agora: Date;
}) {
  const g = GRUPOS[grupo];
  const idTitulo = `t-ocorrencias-${grupo}`;
  return (
    <Card>
      <section aria-labelledby={idTitulo}>
        <CardHead
          titulo={<span id={idTitulo}>{g.titulo}</span>}
          direita={`${itens.length} · ${g.apoio}`}
        />
        {/* Celular: cada ocorrência vira um bloco; a tabela é do computador. */}
        <ul className="divide-fio-3 divide-y md:hidden">
          {itens.map((o) => (
            <li
              key={o.id}
              className={cn(
                "flex flex-col gap-1.5 px-4 py-3",
                ehSensivel(o) && "bg-sensivel-lavado",
              )}
            >
              {o.privada ? <SeloPrivada /> : null}
              <div>
                <Titulo o={o} />
              </div>
              <div className="text-[12.5px]">
                <span className="text-tinta-50">{ROTULO_TIPO[o.tipo]}</span>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Prioridade o={o} />
                <Situacao o={o} agora={agora} />
              </div>
              <div className="text-[12.5px]">
                <span className="text-tinta-50 font-semibold">
                  Quem cuida:{" "}
                </span>
                <Responsavel o={o} />
              </div>
            </li>
          ))}
        </ul>
        <div className="hidden overflow-x-auto md:block">
          <table className={tabelaMock.tabela} data-grupo={grupo}>
            <thead>
              <tr>
                <th className={tabelaMock.th} scope="col">
                  Ocorrência
                </th>
                <th className={tabelaMock.th} scope="col">
                  Tipo
                </th>
                <th className={tabelaMock.th} scope="col">
                  Prioridade
                </th>
                <th className={tabelaMock.th} scope="col">
                  Quem cuida
                </th>
                <th className={tabelaMock.th} scope="col">
                  Aberta
                </th>
                <th className={cn(tabelaMock.th, "w-[150px]")} scope="col">
                  Situação
                </th>
              </tr>
            </thead>
            <tbody>
              {itens.map((o) => (
                <tr
                  key={o.id}
                  data-ocorrencia={o.id}
                  className={cn(
                    tabelaMock.tr,
                    ehSensivel(o) && "bg-sensivel-lavado",
                  )}
                >
                  <td className={tabelaMock.td}>
                    {o.privada ? <SeloPrivada /> : null}
                    <Titulo o={o} />
                  </td>
                  <td className={cn(tabelaMock.td, tabelaMock.sub)}>
                    {ROTULO_TIPO[o.tipo]}
                  </td>
                  <td className={tabelaMock.td}>
                    <Prioridade o={o} />
                  </td>
                  <td className={cn(tabelaMock.td, tabelaMock.sub)}>
                    <Responsavel o={o} />
                  </td>
                  <td className={cn(tabelaMock.td, "font-mono text-[11.5px]")}>
                    {formatarDataHora(o.criadoEm) ?? ""}
                  </td>
                  <td className={tabelaMock.td}>
                    <Situacao o={o} agora={agora} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </Card>
  );
}

/** Fluxo de estados (`.flow`): o caminho que a ocorrência percorre. */
function FluxoDeEstados() {
  return (
    <Card>
      <CardBody>
        <ol
          aria-label="Caminho de uma ocorrência"
          className="flex flex-wrap items-center gap-[7px] text-[11.5px]"
        >
          {ORDEM_STATUS.map((s, i) => (
            <React.Fragment key={s}>
              {i > 0 ? (
                <li aria-hidden="true" className="text-tinta-30 list-none">
                  →
                </li>
              ) : null}
              <li className="border-fio-2 bg-superficie list-none rounded-[6px] border px-[9px] py-[5px] font-mono text-[10.5px]">
                {ROTULO_STATUS[s].toLowerCase()}
              </li>
            </React.Fragment>
          ))}
        </ol>
      </CardBody>
    </Card>
  );
}

export function ListaOcorrenciasTela({
  lista,
  situacao,
  agora = new Date(),
}: {
  lista: ListaOcorrencias;
  situacao: SituacaoOcorrencias;
  agora?: Date;
}) {
  const grupos = ORDEM_GRUPOS.map((grupo) => ({
    grupo,
    itens: lista.ocorrencias.filter((o) => grupoDaOcorrencia(o) === grupo),
  })).filter((g) => g.itens.length > 0);

  const fechadas = lista.ocorrencias.filter(
    (o) => grupoDaOcorrencia(o) === "fechadas",
  ).length;
  const verFechadas = situacao !== "abertas";

  const porTipo = new Map<TipoOcorrencia, number>();
  for (const o of lista.ocorrencias) {
    porTipo.set(o.tipo, (porTipo.get(o.tipo) ?? 0) + 1);
  }
  const fatias: FatiaRosca[] = [...porTipo.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([tipo, valor]) => ({
      rotulo: ROTULO_TIPO[tipo],
      valor,
      tom: TOM_TIPO[tipo],
    }));

  return (
    <div className="flex flex-col gap-3.5">
      <p className="sr-only">{fraseResumoOcorrencias(lista.resumo)}</p>
      <AbasPilula
        rotulo="Filtrar ocorrências"
        ativa={situacao}
        className="self-start"
        abas={[
          { valor: "abertas", rotulo: "Abertas", href: "/ocorrencias" },
          {
            valor: "fechadas",
            rotulo: "Fechadas",
            href: "/ocorrencias?situacao=fechadas",
          },
          {
            valor: "todas",
            rotulo: "Todas",
            href: "/ocorrencias?situacao=todas",
          },
        ]}
      />

      <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-4">
        <Kpi
          rotulo="Ocorrências abertas"
          valor={lista.resumo.abertas}
          delta={
            lista.resumo.vencidas > 0
              ? `${plural(lista.resumo.vencidas, "fora do prazo", "fora do prazo")}`
              : "nenhuma fora do prazo"
          }
          tomDelta={lista.resumo.vencidas > 0 ? "alerta" : "ok"}
        />
        <Kpi
          rotulo="Fechadas"
          valor={verFechadas ? fechadas : "-"}
          delta={
            verFechadas
              ? "resolvidas ou encerradas nesta lista"
              : "veja na aba Fechadas"
          }
        />
        <Kpi
          rotulo="Reincidentes"
          valor="-"
          delta="a mesma causa raiz ainda não é medida"
        />
        <Kpi
          rotulo="Privadas"
          valor={lista.resumo.privadas}
          delta="acesso restrito à coordenação"
        />
      </div>

      {grupos.length === 0 ? (
        <EstadoVazio
          nivelTitulo="h2"
          ilustracao={
            situacao === "abertas" ? (
              <SinoCalmo tamanho={112} />
            ) : (
              <FolhaLupa tamanho={112} />
            )
          }
          titulo={
            situacao === "abertas"
              ? "Nenhuma ocorrência aberta"
              : "Nenhuma ocorrência aqui"
          }
          texto="Quando a equipe abrir uma ocorrência, ou uma pesquisa voltar com nota baixa, ela aparece aqui com o prazo de resposta."
        />
      ) : (
        <div className="grid grid-cols-1 items-start gap-3.5 lg:grid-cols-[minmax(0,1fr)_340px]">
          <div className="flex min-w-0 flex-col gap-3.5">
            {grupos.map(({ grupo, itens }) => (
              <GrupoTabela
                key={grupo}
                grupo={grupo}
                itens={itens}
                agora={agora}
              />
            ))}
            <FluxoDeEstados />
          </div>
          <div className="flex min-w-0 flex-col gap-3.5">
            <Card>
              <CardBody>
                <div className="mb-2.5 flex items-baseline justify-between gap-2">
                  <b className="text-[13px]">Ocorrências por tipo</b>
                  <span className="text-tinta-50 text-[11.5px]">
                    nesta lista
                  </span>
                </div>
                <Rosca
                  rotulo="Ocorrências por tipo"
                  fatias={fatias}
                  centro={{
                    valor: String(lista.ocorrencias.length),
                    legenda: "na lista",
                  }}
                />
              </CardBody>
            </Card>
            <Card>
              <CardBody>
                <div className="mb-2.5 flex items-baseline justify-between gap-2">
                  <b className="text-[13px]">Tempo até resolução</b>
                  <span className="text-tinta-50 text-[11.5px]">
                    horas, por mês
                  </span>
                </div>
                <p className="text-tinta-50 text-[12.5px] leading-[1.6]">
                  Ainda sem histórico suficiente para mostrar. O tempo até a
                  resolução aparece aqui quando houver ocorrências fechadas em
                  mais de um mês.
                </p>
              </CardBody>
            </Card>
          </div>
        </div>
      )}

      <Nota tom="sensivel">
        <b>Ocorrência privada não aparece para todo mundo.</b> Intercorrência e
        perda gestacional geram registro com acesso restrito à coordenação
        clínica e à diretoria. Os demais papéis não veem o título, só que o item
        existe e quem cuida dele.
      </Nota>
    </div>
  );
}
