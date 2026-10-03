import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { CabecalhoTela } from "@/components/shell/cabecalho-tela";
import { Card, CardBody, CardHead } from "@/components/mockup";
import { FaixaAlerta } from "@/components/ui/faixa-alerta";
import { exigirSessao } from "@/lib/auth/sessao";
import type { Regiao } from "@/lib/dados/tipos";
import { FormularioProfissional } from "@/modules/operacao/equipe/componentes/formulario-profissional";
import { listarRegioesParaCadastro } from "@/modules/operacao/equipe/dados";

export const metadata: Metadata = { title: "Nova profissional · Kraamzorg OS" };

/** Cadastro de uma profissional nova (P37 item 1). Só coordenação e diretoria. */
export default async function PaginaNovaProfissional() {
  await exigirSessao("/equipe");
  let regioes: Regiao[] | null = null;
  try {
    regioes = await listarRegioesParaCadastro();
  } catch {
    regioes = null;
  }

  return (
    <>
      <CabecalhoTela titulo="Nova profissional" />
      <Link
        href="/equipe"
        className="text-tinta-70 hover:text-texto min-h-toque -ml-1 inline-flex items-center gap-1.5 pt-2 text-[12.5px] font-medium no-underline"
      >
        <ArrowLeft aria-hidden="true" className="size-4" strokeWidth={1.75} />
        Voltar para a equipe
      </Link>
      <div className="max-w-leitura pt-4">
        {regioes ? (
          <Card>
            <CardHead titulo="Quem entra na equipe" />
            <CardBody className="flex flex-col gap-4">
              <p className="text-tinta-70 text-[12.5px] leading-[1.6]">
                Com o cadastro salvo, ela já aparece na equipe e na escala.
                Documentos e bloqueios entram depois, no cadastro dela.
              </p>
              <FormularioProfissional regioes={regioes} />
            </CardBody>
          </Card>
        ) : (
          <FaixaAlerta variante="erro" titulo="O cadastro não abriu agora">
            As regiões não carregaram. Nada foi alterado; recarregue a página.
          </FaixaAlerta>
        )}
      </div>
    </>
  );
}
