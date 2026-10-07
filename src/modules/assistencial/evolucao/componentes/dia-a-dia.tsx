import { CalendarClock, ChevronDown } from "lucide-react";
import { TileIcone } from "@/components/ui/tile-icone";
import { formatarData, formatarDuracao } from "@/lib/formatacao";
import type { BaseEvolucao } from "@/lib/dados/tipos-evolucao";
import { cn } from "@/lib/utils";
import { CoberturaChecklist } from "./cobertura-checklist";
import {
  montarRotina,
  type Celula,
  type ColunaDia,
  separarCampos,
  type LinhaRotina,
} from "../rotina";
import { ComSiglas } from "@/components/ui/siglas";

/**
 * O dia a dia do atendimento, como a planilha de papel do DOC 2: uma coluna
 * por dia (D1 a D6 ou D12), com a data, o horário combinado, a entrada e a
 * saída da casa e o tempo comparado às horas do plano; embaixo, cada campo
 * do checklist aprovado com o que foi registrado em cada dia.
 *
 * A tabela rola de lado dentro da própria caixa (nunca a página) e a
 * primeira coluna fica presa, para o rótulo não sumir no celular.
 */
export function DiaADia({
  base,
  checklistAberto = false,
}: {
  base: BaseEvolucao;
  /** Abre a grade do checklist já na entrada (fim do checklist assinado da enfermeira). */
  checklistAberto?: boolean;
}) {
  const modelo = montarRotina(base);
  if (modelo.colunas.length === 0) return null;
  const campos = separarCampos(modelo.grupos);

  const plano = planoEmTexto(modelo.diasPrevistos, modelo.horasPorVisita);
  const total = formatarDuracao(modelo.minutosNaCasa);
  const contratado =
    modelo.horasPorVisita && modelo.diasComHorario > 0
      ? formatarDuracao(modelo.horasPorVisita * 60 * modelo.diasComHorario)
      : null;

  return (
    <section
      aria-labelledby="dia-a-dia-titulo"
      className="rounded-3 bg-superficie shadow-1 flex min-w-0 flex-col gap-5 p-5 lg:p-6"
    >
      <div className="flex items-start gap-3">
        <TileIcone tom="lavanda" forma="quadrado">
          <CalendarClock />
        </TileIcone>
        <div className="flex min-w-0 flex-col gap-1 pt-1">
          <h2
            id="dia-a-dia-titulo"
            className="font-titulo text-2 text-texto font-medium"
          >
            Dia a dia do atendimento
          </h2>
          <p className="text-apoio text-texto-2 max-w-[64ch]">
            {modelo.diasComRegistro === 1
              ? "1 dia com registro"
              : `${modelo.diasComRegistro} dias com registro`}{" "}
            de {modelo.diasPrevistos} contratados
            {plano ? ` (${plano})` : ""}.
            {total && modelo.diasComHorario > 0
              ? ` Tempo na casa somando entrada e saída: ${total}${contratado ? `, para ${contratado} do plano nesses dias` : ""}.`
              : ""}
          </p>
          <p className="text-apoio text-texto-2 max-w-[64ch]">
            É só leitura. Quem preenche é a enfermeira, no checklist de cada
            visita, pelo portal.
          </p>
        </div>
      </div>

      <Identificacao base={base} />

      <Grade
        rotulo="Data, entrada e saída de cada dia"
        colunas={modelo.colunas}
        secoes={[{ chave: "agenda", titulo: null, linhas: modelo.agenda }]}
        tom="lavanda"
        dataNoCabecalho={false}
      />
      <p className="text-mini text-texto-2 -mt-2 max-w-[64ch]">
        A entrada e a saída vêm dos botões “Cheguei” e “Saí da casa”, que a
        enfermeira toca durante a visita. Dia sem toque fica em branco.
      </p>

      <CoberturaChecklist
        dias={modelo.diasChecklist}
        campos={campos}
        grupos={modelo.grupos}
      />

      {campos.totalComRegistro > 0 ? (
        <details className="group/detalhe" open={checklistAberto}>
          <summary className="rounded-pilula bg-areia-clara text-apoio text-texto min-h-toque ease-estado hover:bg-areia inline-flex w-fit cursor-pointer list-none items-center gap-2 px-5 font-semibold transition-colors duration-140 [&::-webkit-details-marker]:hidden">
            <ChevronDown
              aria-hidden="true"
              className="size-4 transition-transform duration-140 group-open/detalhe:rotate-180"
              strokeWidth={2}
            />
            <span className="group-open/detalhe:hidden">
              Ver as marcações de cada dia ({campos.totalComRegistro} campos
              registrados)
            </span>
            <span className="hidden group-open/detalhe:inline">
              Esconder as marcações de cada dia
            </span>
          </summary>
          <div className="mt-4">
            <Grade
              rotulo="Marcações do checklist de cada dia"
              colunas={modelo.colunas}
              secoes={campos.comRegistro.map((g) => ({
                chave: g.chave,
                titulo: g.titulo,
                linhas: g.linhas,
              }))}
              tom="areia"
              dataNoCabecalho
            />
          </div>
        </details>
      ) : null}
    </section>
  );
}

function planoEmTexto(dias: number, horas: number | null): string | null {
  if (!horas) return null;
  const porDia = formatarDuracao(horas * 60);
  return porDia ? `${dias} dias de ${porDia}` : null;
}

/** O cabeçalho da planilha: quem é a paciente, o bebê, os médicos e a alta. */
function Identificacao({ base }: { base: BaseEvolucao }) {
  const obstetra = base.medicos.find((m) => m.especialidade === "obstetra");
  const pediatra = base.medicos.find((m) => m.especialidade === "pediatra");
  const itens: { rotulo: string; valor: string }[] = [];
  if (base.paciente)
    itens.push({ rotulo: "Paciente", valor: base.paciente.nome });
  for (const bebe of base.bebes) {
    const pesos = [
      bebe.pesoNascimentoG ? `${gramas(bebe.pesoNascimentoG)} ao nascer` : null,
      bebe.pesoAltaG ? `${gramas(bebe.pesoAltaG)} na alta` : null,
    ].filter(Boolean);
    itens.push({
      rotulo: base.bebes.length > 1 ? `Bebê ${bebe.ordem}` : "Bebê",
      valor: [bebe.nome ?? "Sem nome ainda", ...pesos].join(", "),
    });
  }
  if (obstetra) itens.push({ rotulo: "Obstetra", valor: obstetra.nome });
  if (pediatra) itens.push({ rotulo: "Pediatra", valor: pediatra.nome });
  const alta = base.acompanhamento.dataAlta
    ? formatarData(base.acompanhamento.dataAlta)
    : null;
  if (alta) itens.push({ rotulo: "Alta", valor: alta });
  if (itens.length === 0) return null;

  return (
    <dl className="rounded-2 bg-areia-clara grid gap-x-6 gap-y-3 p-4 sm:grid-cols-2 lg:grid-cols-3">
      {itens.map((item) => (
        <div key={item.rotulo} className="flex min-w-0 flex-col gap-0.5">
          <dt className="text-mini text-texto-2">{item.rotulo}</dt>
          <dd className="text-apoio text-texto font-medium break-words">
            {item.valor}
          </dd>
        </div>
      ))}
    </dl>
  );
}

function gramas(valor: number): string {
  return `${valor.toLocaleString("pt-BR")} g`;
}

interface Secao {
  chave: string;
  titulo: string | null;
  linhas: LinhaRotina[];
}

const CABECALHO_TOM = {
  lavanda: "bg-lavanda-clara",
  areia: "bg-areia-clara",
} as const;

function Grade({
  rotulo,
  colunas,
  secoes,
  tom,
  dataNoCabecalho,
}: {
  rotulo: string;
  colunas: ColunaDia[];
  secoes: Secao[];
  tom: keyof typeof CABECALHO_TOM;
  /** Na agenda a data já tem linha própria; no checklist ela fica embaixo do D. */
  dataNoCabecalho: boolean;
}) {
  const fundo = CABECALHO_TOM[tom];
  return (
    <div
      role="region"
      aria-label={`${rotulo}. Role para o lado para ver todos os dias.`}
      tabIndex={0}
      className="rounded-2 border-linha focus-visible:outline-foco relative w-full max-w-full overflow-x-auto border focus-visible:outline-2 focus-visible:outline-offset-2"
    >
      <table className="text-apoio w-max min-w-full border-separate border-spacing-0">
        <caption className="sr-only">{rotulo}</caption>
        <thead>
          <tr>
            <th
              scope="col"
              className={cn(
                "text-mini text-texto-2 sticky left-0 z-10 w-32 min-w-32 px-3 py-2 text-left font-medium sm:w-48 sm:min-w-48",
                fundo,
              )}
            >
              <span className="sr-only">Campo</span>
            </th>
            {colunas.map((coluna) => (
              <th
                key={coluna.diaNumero}
                scope="col"
                className={cn(
                  "min-w-24 px-3 py-2 text-left align-bottom",
                  fundo,
                )}
              >
                <span className="text-texto block font-mono font-semibold">
                  D{coluna.diaNumero}
                </span>
                {dataNoCabecalho ? (
                  <span className="text-mini text-texto-2 block font-mono font-normal">
                    {coluna.data ?? "a marcar"}
                  </span>
                ) : null}
              </th>
            ))}
          </tr>
        </thead>
        {secoes.map((secao) => (
          <tbody key={secao.chave}>
            {secao.titulo ? (
              <tr>
                <th
                  scope="colgroup"
                  colSpan={colunas.length + 1}
                  className="border-linha bg-areia-clara border-t px-3 pt-3 pb-2 text-left"
                >
                  <span className="text-apoio text-texto sticky left-3 font-semibold">
                    {secao.titulo}
                  </span>
                </th>
              </tr>
            ) : null}
            {secao.linhas.map((linha) => (
              <tr key={linha.chave} className="group/linha">
                <th
                  scope="row"
                  className="border-linha bg-superficie text-texto-2 group-hover/linha:bg-creme sticky left-0 z-10 w-32 min-w-32 border-t px-3 py-2 text-left align-top font-normal sm:w-48 sm:min-w-48"
                >
                  <ComSiglas texto={linha.rotulo} />
                </th>
                {linha.celulas.map((celula, i) => (
                  <td
                    key={colunas[i]!.diaNumero}
                    className="border-linha group-hover/linha:bg-creme min-w-24 border-t px-3 py-2 align-top"
                  >
                    <ValorCelula celula={celula} />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        ))}
      </table>
    </div>
  );
}

function ValorCelula({ celula }: { celula: Celula | null }) {
  if (!celula) {
    return (
      <>
        <span
          aria-hidden="true"
          className="bg-marinho-14 inline-block size-1.5 rounded-full align-middle"
        />
        <span className="sr-only">Sem registro</span>
      </>
    );
  }
  return (
    <span className="flex max-w-36 flex-col sm:max-w-52">
      <span className="text-texto break-words">{celula.principal}</span>
      {celula.detalhe ? (
        <span className="text-mini text-texto-2 break-words">
          {celula.detalhe}
        </span>
      ) : null}
    </span>
  );
}
