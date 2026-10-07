import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { FaixaAlerta } from "@/components/ui/faixa-alerta";
import { formatarData } from "@/lib/formatacao";
import { camposVisiveis } from "../campos";
import type { TelaDocumento } from "../dados";
import { slugDoDocumento } from "../documento";
import { montarRotina, separarCampos } from "../rotina";
import { DiaADia } from "./dia-a-dia";
import { EditorEvolucao } from "./editor-evolucao";
import { MontarEvolucao } from "./montar-evolucao";

type TelaOk = Extract<TelaDocumento, { situacao: "ok" }>;

/**
 * Um documento da evolução, para a coordenação (`/evolucoes/...`) e para a
 * enfermeira (`/minhas-evolucoes/...`). Sem rascunho, mostra o que o
 * checklist já trouxe, o que falta e o botão de montar; com rascunho, abre o
 * editor. O nome da família aparece só aqui, dentro da página.
 */
export function TelaDocumentoEvolucao({
  tela,
  base,
  ehCoordenacao,
}: {
  tela: TelaOk;
  base: "/evolucoes" | "/minhas-evolucoes";
  ehCoordenacao: boolean;
}) {
  const { detalhe, documento, dados, faltas, demonstracao } = tela;
  const slug = slugDoDocumento({
    tipo: documento.tipo,
    bebeOrdem: documento.bebeOrdem,
  });
  const acompanhamentoId = tela.base.acompanhamento.id;
  const periodo = tela.base.acompanhamento;
  // Nenhum campo do checklist registrado em dia nenhum: a evolução nasce vazia.
  const semChecklist =
    separarCampos(montarRotina(tela.base).grupos).totalComRegistro === 0;

  const voltar = (
    <Link
      href={base}
      className="text-apoio text-texto-2 hover:text-texto min-h-toque -ml-1 inline-flex items-center gap-1.5 pt-2 font-medium no-underline"
    >
      <ArrowLeft aria-hidden="true" className="size-4" strokeWidth={1.75} />
      Evoluções
    </Link>
  );

  return (
    <>
      {voltar}
      <div className="flex flex-col gap-6 pt-2">
        <header className="rounded-3 border-linha bg-superficie shadow-1 flex items-start gap-4 border p-4">
          <div className="flex min-w-0 flex-col gap-1">
            <h1 className="font-titulo text-texto text-[19px] font-light">
              {documento.rotulo}
            </h1>
            <p className="text-corpo text-texto-2">
              {tela.base.familiaNome}
              {periodo.inicio && periodo.fim ? (
                <>
                  , de{" "}
                  <span className="font-mono">
                    {formatarData(periodo.inicio)}
                  </span>{" "}
                  a{" "}
                  <span className="font-mono">{formatarData(periodo.fim)}</span>
                </>
              ) : null}
              .
            </p>
          </div>
        </header>

        {semChecklist ? (
          <FaixaAlerta
            variante="info"
            titulo="Os checklists dessa família ainda não foram registrados"
          >
            A evolução é montada com o que a enfermeira registra no checklist de
            cada visita. Sem isso, os campos clínicos abaixo ficam em branco
            para digitar à mão.{" "}
            <a
              href="#checklist-dias-titulo"
              className="text-texto font-semibold underline decoration-1 underline-offset-4"
            >
              Ver quais dias faltam e onde a enfermeira preenche
            </a>
            .
          </FaixaAlerta>
        ) : null}

        {detalhe ? (
          <EditorEvolucao
            detalhe={detalhe}
            rotulo={documento.rotulo}
            campos={camposVisiveis(documento.tipo, dados)}
            dados={dados}
            ehCoordenacao={ehCoordenacao}
            caminhoPdf={`${base}/${acompanhamentoId}/${slug}/pdf${detalhe.temPdf ? "" : "?previa=1"}`}
            demonstracao={demonstracao}
            semChecklist={semChecklist}
          />
        ) : (
          <div className="rounded-3 border-linha bg-superficie shadow-1 flex flex-col gap-5 border p-4">
            <div className="flex items-start gap-3">
              <p className="text-corpo text-texto max-w-[60ch]">
                Este documento ainda não foi montado. O rascunho junta o que o
                checklist registrou em cada visita e o que está no cadastro da
                família, e deixa em branco o que só a enfermeira pode dizer.
              </p>
            </div>
            {faltas.length > 0 ? (
              <FaixaAlerta
                variante="info"
                titulo="O que ainda vai faltar depois de montar"
              >
                <ul className="list-disc pl-5">
                  {faltas.map((falta) => (
                    <li key={falta}>{falta}</li>
                  ))}
                </ul>
              </FaixaAlerta>
            ) : null}
            <MontarEvolucao acompanhamentoId={acompanhamentoId} slug={slug} />
          </div>
        )}

        <DiaADia base={tela.base} />
      </div>
    </>
  );
}
