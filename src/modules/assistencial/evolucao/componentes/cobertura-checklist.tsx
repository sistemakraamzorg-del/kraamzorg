import Link from "next/link";
import {
  Check,
  ChevronDown,
  ChevronRight,
  ClipboardCheck,
  Smartphone,
} from "lucide-react";
import { Selo } from "@/components/ui/selo";
import { TileIcone } from "@/components/ui/tile-icone";
import { cn } from "@/lib/utils";
import type {
  DiaChecklist,
  GrupoRotina,
  ResumoCampos,
  SituacaoChecklistDia,
} from "../rotina";
import { grupoContaNaCobertura } from "../rotina";

/**
 * O estado do checklist da família, dia a dia e campo a campo, em linguagem de
 * quem usa o sistema: quais dias já têm checklist, o que cada bloco já tem de
 * marcação e o que falta. Quando nenhum dia foi registrado, em vez de uma
 * lista de campos vazios, mostra onde a enfermeira preenche (portal, visita do
 * dia). Só leitura.
 */

const ROTULO_DIA: Record<
  SituacaoChecklistDia,
  { texto: string; variante: "sucesso" | "aviso" | "neutro" | "contorno" }
> = {
  feito: { texto: "Feito", variante: "sucesso" },
  sem_campos: { texto: "Sem campos", variante: "aviso" },
  falta: { texto: "Falta preencher", variante: "aviso" },
  adiante: { texto: "Ainda não chegou", variante: "contorno" },
  nao_aconteceu: { texto: "Não aconteceu", variante: "neutro" },
};

const PASSOS_DA_ENFERMEIRA = [
  "Abrir o portal da enfermeira e entrar em Hoje.",
  "Escolher a visita do dia e tocar em Cheguei.",
  "Preencher o checklist, uma etapa de cada vez. Funciona sem sinal e sobe sozinho.",
  "Assinar o dia e tocar em Saí da casa.",
];

export function CoberturaChecklist({
  dias,
  campos,
  grupos,
}: {
  dias: DiaChecklist[];
  campos: ResumoCampos;
  grupos: GrupoRotina[];
}) {
  const totalCampos = campos.totalComRegistro + campos.totalSemRegistro;
  const vazio = campos.totalComRegistro === 0;
  const feitos = dias.filter((d) => d.situacao === "feito").length;

  return (
    <div className="flex flex-col gap-5">
      <section
        aria-labelledby="checklist-dias-titulo"
        className="flex flex-col gap-3"
      >
        <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
          <h3
            id="checklist-dias-titulo"
            className="text-corpo text-texto font-semibold"
          >
            Checklist de cada dia
          </h3>
          <p className="text-apoio text-texto-2">
            {feitos === 0
              ? "Nenhum dia com checklist registrado"
              : feitos === 1
                ? "1 dia com checklist registrado"
                : `${feitos} dias com checklist registrado`}{" "}
            de {dias.length}
          </p>
        </div>
        <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
          {dias.map((dia) => (
            <li key={dia.diaNumero}>
              <CartaoDia dia={dia} />
            </li>
          ))}
        </ul>
      </section>

      {vazio ? (
        <ComoPreencher />
      ) : (
        <ResumoPorBloco
          campos={campos}
          grupos={grupos}
          totalCampos={totalCampos}
        />
      )}
    </div>
  );
}

function CartaoDia({ dia }: { dia: DiaChecklist }) {
  const rotulo = ROTULO_DIA[dia.situacao];
  const abre =
    dia.visitaId !== null &&
    (dia.situacao === "feito" ||
      dia.situacao === "sem_campos" ||
      dia.situacao === "falta");
  const conteudo = (
    <>
      <span className="flex items-baseline justify-between gap-2">
        <span className="text-texto font-mono text-sm font-semibold">
          D{dia.diaNumero}
        </span>
        <span className="text-mini text-texto-2 font-mono">
          {dia.data ?? "a marcar"}
        </span>
      </span>
      <Selo variante={rotulo.variante} className="w-fit">
        {dia.situacao === "feito" ? (
          <Check aria-hidden="true" className="size-3" strokeWidth={2.5} />
        ) : null}
        {rotulo.texto}
      </Selo>
      <span className="text-mini text-texto-2 flex items-center gap-1">
        {dia.situacao === "feito" ? (
          <>
            {dia.campos} {dia.campos === 1 ? "campo" : "campos"}
            <ChevronRight
              aria-hidden="true"
              className="ml-auto size-3.5 shrink-0"
            />
          </>
        ) : abre ? (
          <>
            Abrir a visita
            <ChevronRight
              aria-hidden="true"
              className="ml-auto size-3.5 shrink-0"
            />
          </>
        ) : (
          " "
        )}
      </span>
    </>
  );
  const classe = cn(
    "rounded-2 border-linha bg-superficie flex min-h-[88px] flex-col justify-between gap-2 border p-3",
    abre &&
      "hover:bg-areia-clara focus-visible:outline-foco ease-estado no-underline transition-colors duration-140 focus-visible:outline-2 focus-visible:outline-offset-2",
  );
  return abre ? (
    <Link href={`/visita/${dia.visitaId}`} className={classe}>
      {conteudo}
    </Link>
  ) : (
    <div className={classe}>{conteudo}</div>
  );
}

/** Quando nenhum dia tem checklist: onde a enfermeira preenche, em passos. */
function ComoPreencher() {
  return (
    <section
      aria-labelledby="como-preencher-titulo"
      className="rounded-3 bg-areia-clara flex flex-col gap-4 p-5"
    >
      <div className="flex items-start gap-3">
        <TileIcone tom="areia" forma="quadrado" tamanho="p">
          <Smartphone />
        </TileIcone>
        <div className="flex min-w-0 flex-col gap-1">
          <h3
            id="como-preencher-titulo"
            className="text-corpo text-texto font-semibold"
          >
            O checklist é preenchido pela enfermeira, na visita
          </h3>
          <p className="text-apoio text-texto-2 max-w-[62ch]">
            Esta tela só mostra o que ela registrou. Quando o dia é assinado, as
            marcações aparecem aqui sozinhas e a evolução já nasce
            pré-preenchida.
          </p>
        </div>
      </div>
      <ol className="flex flex-col gap-2">
        {PASSOS_DA_ENFERMEIRA.map((passo, i) => (
          <li key={passo} className="flex items-start gap-3">
            <span
              aria-hidden="true"
              className="bg-marinho text-texto-inverso mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full font-mono text-xs font-semibold"
            >
              {i + 1}
            </span>
            <span className="text-apoio text-texto max-w-[62ch] pt-0.5">
              {passo}
            </span>
          </li>
        ))}
      </ol>
    </section>
  );
}

/** Quando há marcações: cobertura geral e por bloco, com o que falta em etiquetas. */
function ResumoPorBloco({
  campos,
  grupos,
  totalCampos,
}: {
  campos: ResumoCampos;
  grupos: GrupoRotina[];
  totalCampos: number;
}) {
  const percentual = Math.round((campos.totalComRegistro / totalCampos) * 100);
  const blocos = grupos
    .filter((g) => grupoContaNaCobertura(g.chave))
    .map((g) => {
      const feitos = g.linhas.filter((l) =>
        l.celulas.some((c) => c !== null),
      ).length;
      const faltam = g.linhas
        .filter((l) => l.celulas.every((c) => c === null))
        .map((l) => l.rotulo);
      return {
        chave: g.chave,
        titulo: g.titulo,
        total: g.linhas.length,
        feitos,
        faltam,
      };
    });
  const incompletos = blocos.filter((b) => b.faltam.length > 0);

  return (
    <section
      aria-labelledby="cobertura-titulo"
      className="rounded-3 border-linha flex flex-col gap-4 border p-5"
    >
      <div className="flex items-start gap-3">
        <TileIcone tom="salvia" forma="quadrado" tamanho="p">
          <ClipboardCheck />
        </TileIcone>
        <div className="flex min-w-0 flex-1 flex-col gap-2">
          <h3
            id="cobertura-titulo"
            className="text-corpo text-texto font-semibold"
          >
            Quanto do checklist já tem marcação
          </h3>
          <div className="flex items-center gap-3">
            <div
              role="img"
              aria-label={`${campos.totalComRegistro} de ${totalCampos} campos com registro`}
              className="bg-marinho-14 h-2 max-w-md flex-1 overflow-hidden rounded-full"
            >
              <div
                className="bg-marinho h-full rounded-full"
                style={{ width: `${percentual}%` }}
              />
            </div>
            <p className="text-apoio text-texto font-medium whitespace-nowrap">
              <span className="font-mono">{campos.totalComRegistro}</span> de{" "}
              <span className="font-mono">{totalCampos}</span> campos
            </p>
          </div>
          <p className="text-apoio text-texto-2 max-w-[62ch]">
            {incompletos.length === 0
              ? "Todos os campos do checklist têm marcação em algum dia."
              : "Estes campos não tiveram marcação em nenhum dia. Alguns só valem em certos casos, como cesárea ou laserterapia. Quem preenche é a enfermeira, na visita."}
          </p>
        </div>
      </div>

      {incompletos.length > 0 ? (
        <details className="group/falta">
          <summary className="text-apoio text-texto min-h-toque hover:bg-areia-clara rounded-pilula -ml-2 inline-flex cursor-pointer list-none items-center gap-2 px-3 font-semibold [&::-webkit-details-marker]:hidden">
            <ChevronDown
              aria-hidden="true"
              className="size-4 transition-transform duration-140 group-open/falta:rotate-180"
              strokeWidth={2}
            />
            Ver o que falta, bloco a bloco ({campos.totalSemRegistro}{" "}
            {campos.totalSemRegistro === 1 ? "campo" : "campos"})
          </summary>
          <ul className="mt-2 flex flex-col divide-y divide-[var(--color-linha)]">
            {incompletos.map((b) => (
              <li key={b.chave} className="flex flex-col gap-2 py-3">
                <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1">
                  <span className="text-apoio text-texto font-medium">
                    {b.titulo}
                  </span>
                  <span className="text-mini text-texto-2 font-mono">
                    {b.feitos} de {b.total}
                  </span>
                </div>
                <ul className="flex flex-wrap gap-1.5">
                  {b.faltam.map((rotulo) => (
                    <li
                      key={rotulo}
                      className="rounded-pilula bg-areia-clara text-mini text-texto px-2.5 py-1"
                    >
                      {rotulo}
                    </li>
                  ))}
                </ul>
              </li>
            ))}
          </ul>
        </details>
      ) : null}
    </section>
  );
}
