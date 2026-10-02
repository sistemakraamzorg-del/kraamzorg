import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { FaixaAlerta } from "@/components/ui/faixa-alerta";
import { notFound } from "next/navigation";
import { Selo } from "@/components/ui/selo";
import { exigirSessao } from "@/lib/auth/sessao";
import { obterRepositorios } from "@/lib/dados/fabrica";
import type { DetalheCandidata } from "@/lib/dados/tipos-relacao";
import { formatarData } from "@/lib/formatacao";
import { Avatar, BlocoFicha } from "@/modules/relacao/componentes/faixa-resumo";
import { ROTULO_ESTADO_CANDIDATA } from "@/modules/relacao/rotulos";
import { FormularioAvaliacao } from "@/modules/talentos/componentes/form-avaliacao";
import {
  FormularioCandidata,
  MudarEtapa,
} from "@/modules/talentos/componentes/form-candidata";

export const metadata: Metadata = { title: "Candidata · Kraamzorg OS" };

/** Ficha da candidata: dados, etapa, entrevista pelo roteiro e histórico de avaliações (P51 item 3). */
export default async function PaginaCandidata({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  await exigirSessao(`/talentos/${id}`);
  let candidata: DetalheCandidata | null = null;
  let falhou = false;
  try {
    candidata = await (await obterRepositorios()).relacao.talentos.obter(id);
  } catch (erro) {
    console.error(
      "[tela-erro] /talentos/[id]",
      erro instanceof Error ? erro.message : erro,
    );
    falhou = true;
  }
  if (falhou) {
    return (
      <FaixaAlerta variante="erro" titulo="A ficha não abriu agora">
        Nada foi alterado. Confira a conexão e recarregue a página.
      </FaixaAlerta>
    );
  }
  if (!candidata) notFound();

  const mediaGeral = candidata.avaliacoes
    .map((a) => a.media)
    .filter((m): m is number => m !== null);
  const media = mediaGeral.length
    ? mediaGeral.reduce((a, n) => a + n, 0) / mediaGeral.length
    : null;

  return (
    <div className="flex flex-col gap-6 pt-2">
      <Link
        href="/talentos"
        className="text-apoio text-texto-2 hover:text-texto min-h-toque -ml-1 inline-flex items-center gap-1.5 self-start font-medium no-underline"
      >
        <ArrowLeft aria-hidden="true" className="size-4" strokeWidth={1.75} />
        Voltar para o banco de talentos
      </Link>

      <header className="rounded-3 border-linha bg-superficie border-t-dourado flex flex-wrap items-center gap-4 border border-t-[3px] px-5 py-5 lg:px-8">
        <Avatar nome={candidata.nome} className="text-3 size-14" />
        <div className="min-w-0 flex-1">
          <p className="text-mini text-texto-2 font-medium tracking-[0.14em] uppercase">
            Candidata
          </p>
          <h1 className="font-titulo text-display lg:text-display-lg text-texto font-normal">
            {candidata.nome}
          </h1>
          <p className="text-apoio text-texto-2">
            Chegou em{" "}
            <span className="font-mono">
              {formatarData(candidata.criadoEm)}
            </span>
            , por{" "}
            {candidata.origem === "pagina_publica"
              ? "página pública"
              : "cadastro da equipe"}
            {candidata.cidade ? `, de ${candidata.cidade}` : ""}.
          </p>
        </div>
        <Selo variante={candidata.estado === "aprovada" ? "sucesso" : "neutro"}>
          {ROTULO_ESTADO_CANDIDATA[candidata.estado]}
        </Selo>
      </header>

      <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-2">
        <div className="flex flex-col gap-6">
          <BlocoFicha
            id="etapa"
            titulo="Etapa"
            nota="Onde ela está no processo de seleção."
          >
            <MudarEtapa candidataId={candidata.id} estado={candidata.estado} />
          </BlocoFicha>

          <BlocoFicha
            id="avaliacoes"
            titulo="Histórico de entrevistas"
            nota={
              candidata.avaliacoes.length === 0
                ? undefined
                : `${candidata.avaliacoes.length} ${candidata.avaliacoes.length === 1 ? "entrevista" : "entrevistas"}${media !== null ? `, média ${media.toFixed(1).replace(".", ",")}` : ""}`
            }
          >
            {candidata.avaliacoes.length === 0 ? (
              <p className="text-corpo text-texto-2">
                Nenhuma entrevista registrada ainda. Use o roteiro abaixo para
                registrar a primeira, com as respostas e a nota de cada
                critério.
              </p>
            ) : (
              <ul className="flex flex-col gap-3">
                {candidata.avaliacoes.map((a) => (
                  <li
                    key={a.id}
                    className="rounded-2 border-linha bg-areia-clara flex flex-col gap-1 border p-4"
                  >
                    <p className="text-corpo text-texto">
                      {formatarData(a.em)}, por {a.avaliador ?? "equipe"},
                      roteiro {a.roteiroVersao}.
                    </p>
                    <p className="text-apoio text-texto-2">
                      {a.criteriosAvaliados} de{" "}
                      {candidata.roteiro.criterios.length} critérios avaliados
                      {a.media !== null
                        ? `, média ${a.media.toFixed(1).replace(".", ",")}`
                        : ""}
                      .
                    </p>
                    {a.observacoes ? (
                      <p className="text-corpo text-texto">{a.observacoes}</p>
                    ) : null}
                  </li>
                ))}
              </ul>
            )}
          </BlocoFicha>
        </div>

        <FormularioCandidata candidata={candidata} />
      </div>

      <BlocoFicha
        id="nova-entrevista"
        titulo="Registrar entrevista"
        nota="Pelo roteiro aprovado: as respostas e a nota de cada critério."
      >
        <FormularioAvaliacao
          candidataId={candidata.id}
          roteiro={candidata.roteiro}
        />
      </BlocoFicha>
    </div>
  );
}
