import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import { ArrowLeft } from "lucide-react";
import { z } from "zod";
import { CabecalhoTela } from "@/components/shell/cabecalho-tela";
import { Card, CardBody, CardHead } from "@/components/mockup";
import { FaixaAlerta } from "@/components/ui/faixa-alerta";
import { Selo } from "@/components/ui/selo";
import { exigirSessao } from "@/lib/auth/sessao";
import { formatarData } from "@/lib/formatacao";
import { FormularioProfissional } from "@/modules/operacao/equipe/componentes/formulario-profissional";
import { SecaoBloqueios } from "@/modules/operacao/equipe/componentes/secao-bloqueios";
import { SecaoDocumentos } from "@/modules/operacao/equipe/componentes/secao-documentos";
import {
  LegendaSemana,
  SemanaEquipe,
} from "@/modules/operacao/equipe/componentes/semana-equipe";
import { SeloEstadoProfissional } from "@/modules/operacao/equipe/componentes/selo-estado";
import {
  carregarProfissional,
  type DetalheProfissional,
} from "@/modules/operacao/equipe/dados";
import { ROTULO_FUNCAO } from "@/modules/operacao/equipe/textos";

export const metadata: Metadata = { title: "Profissional · Kraamzorg OS" };

type Pesquisa = Record<string, string | string[] | undefined>;

const FEITO: Record<string, string> = {
  criada: "Profissional cadastrada. Ela já aparece na equipe e na escala.",
  salva: "Cadastro salvo.",
};

/** Um assunto do cadastro: cartão do mockup (`.card`) com o título em Jost. */
function Secao({
  id,
  titulo,
  children,
}: {
  id: string;
  titulo: string;
  children: ReactNode;
}) {
  return (
    <section aria-labelledby={id}>
      <Card>
        <CardHead titulo={<span id={id}>{titulo}</span>} />
        <CardBody className="flex flex-col gap-4">{children}</CardBody>
      </Card>
    </section>
  );
}

/**
 * Cadastro de uma profissional (P37 item 1): estado de hoje e semana,
 * famílias em curso, documentos com validade, bloqueios de agenda e os
 * dados do cadastro. O estado é só leitura (calculado).
 */
export default async function PaginaProfissional({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Pesquisa>;
}) {
  await exigirSessao("/equipe");
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) notFound();
  const pesquisa = await searchParams;
  const feito =
    FEITO[
      String(
        Array.isArray(pesquisa.feito)
          ? pesquisa.feito[0]
          : (pesquisa.feito ?? ""),
      )
    ];

  let detalhe: DetalheProfissional | null = null;
  try {
    detalhe = await carregarProfissional(id);
  } catch {
    return (
      <>
        <CabecalhoTela titulo="Profissional" />
        <div className="pt-6">
          <FaixaAlerta variante="erro" titulo="O cadastro não abriu agora">
            Nada foi alterado. Recarregue a página; se continuar, avise a equipe
            técnica.
          </FaixaAlerta>
        </div>
      </>
    );
  }
  if (!detalhe) notFound();

  const { profissional: p, visao, linhaEscala, regioes } = detalhe;

  return (
    <>
      <CabecalhoTela
        titulo={p.nome}
        lateral={
          p.status ? (
            <SeloEstadoProfissional estado={p.status} />
          ) : (
            <Selo variante="neutro">Inativa</Selo>
          )
        }
        subtitulo={`${ROTULO_FUNCAO[p.funcao] ?? p.funcao}${p.conselhoNumero ? ` · COREN ${p.conselhoUf} ${p.conselhoNumero}` : ""}`}
      />
      <Link
        href="/equipe"
        className="text-tinta-70 hover:text-texto min-h-toque -ml-1 inline-flex items-center gap-1.5 pt-2 text-[12.5px] font-medium no-underline"
      >
        <ArrowLeft aria-hidden="true" className="size-4" strokeWidth={1.75} />
        Voltar para a equipe
      </Link>

      <div className="flex flex-col gap-3.5 pt-4">
        {feito ? <FaixaAlerta variante="sucesso" titulo={feito} /> : null}

        <div className="grid grid-cols-1 items-start gap-3.5 lg:grid-cols-[minmax(0,62fr)_minmax(0,38fr)]">
          {p.atendeVisitas && linhaEscala ? (
            <Secao id="semana" titulo="Semana">
              <SemanaEquipe
                dias={linhaEscala.dias}
                hoje={visao.hoje}
                nome={p.nome}
              />
              <LegendaSemana />
              <p className="text-tinta-50 text-[11.5px]">
                O estado vem das ofertas, das visitas e dos bloqueios. Ninguém
                precisa marcar nada à mão.
              </p>
            </Secao>
          ) : null}

          {p.familias.length > 0 ? (
            <Secao id="familias" titulo="Famílias em curso">
              <ul className="flex flex-col gap-2">
                {p.familias.map((f) => (
                  <li
                    key={f.acompanhamentoId}
                    className="border-fio-3 flex flex-wrap items-center justify-between gap-x-3 border-b py-1 last:border-b-0"
                  >
                    <Link
                      href={`/familias/${f.familiaId}`}
                      className="min-h-toque inline-flex items-center text-[13px] font-semibold underline underline-offset-4"
                    >
                      {f.nomeExibicao}
                    </Link>
                    <span className="text-tinta-50 font-mono text-[11.5px]">
                      {f.papel === "backup" ? "backup · " : ""}
                      {f.diaAtual !== null
                        ? `D${f.diaAtual} de ${f.diasContratados}`
                        : f.dpp
                          ? `DPP ${formatarData(f.dpp)} (estimativa)`
                          : "aguardando"}
                    </span>
                  </li>
                ))}
              </ul>
            </Secao>
          ) : null}
        </div>

        <Secao id="documentos" titulo="Documentos">
          <SecaoDocumentos
            profissionalId={p.id}
            documentos={p.documentos}
            tiposSugeridos={visao.documentoTipos}
          />
        </Secao>

        <Secao id="bloqueios" titulo="Bloqueios de agenda">
          <SecaoBloqueios
            profissionalId={p.id}
            bloqueios={p.bloqueios}
            hoje={visao.hoje}
          />
        </Secao>
        <Secao id="cadastro" titulo="Cadastro">
          <FormularioProfissional profissional={p} regioes={regioes} />
        </Secao>
      </div>
    </>
  );
}
