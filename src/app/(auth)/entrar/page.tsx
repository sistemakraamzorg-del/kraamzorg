import type { Metadata } from "next";
import { Lock, ShieldCheck, UserRound } from "lucide-react";
import { FaixaAlerta } from "@/components/ui/faixa-alerta";
import { TileIcone } from "@/components/ui/tile-icone";
import { descreverPapeis } from "@/lib/auth/papeis";
import { obterAutenticacao } from "@/lib/auth/sessao";
import { entrarPorSeletor } from "../acoes";
import { FormularioEntrar } from "../_componentes/formularios";
import {
  parametro,
  proximoDaBusca,
  type ParametrosBusca,
} from "../_componentes/parametros";
import { AVISO_ENTRAR, TEXTO_LGPD } from "../mensagens";

export const metadata: Metadata = { title: "Entrar · Kraamzorg OS" };

/**
 * C7 · Entrar (telas.md; protótipo entrar.html). E-mail e senha na real;
 * no modo demonstração, só em desenvolvimento, um seletor das pessoas
 * fictícias do seed. A tela pergunta a forma de entrada à autenticação e
 * não sabe qual implementação está rodando.
 */
export default async function PaginaEntrar({
  searchParams,
}: {
  searchParams: ParametrosBusca;
}) {
  const busca = await searchParams;
  const proximo = proximoDaBusca(busca);
  const aviso = AVISO_ENTRAR[parametro(busca, "aviso") ?? ""];
  const forma = obterAutenticacao().formaDeEntrada();

  return (
    <>
      <div className="flex flex-col gap-2">
        <span className="bg-dourado-claro text-texto rounded-pilula text-apoio inline-flex w-fit items-center gap-1.5 px-3 py-1 font-semibold">
          <ShieldCheck aria-hidden="true" className="size-4" strokeWidth={1.75} />
          Verificação em duas etapas
        </span>
        <h1 className="font-titulo text-display text-texto font-light">
          Entrar no sistema
        </h1>
        <p className="text-corpo text-texto-2">
          Use o e-mail e a senha do seu acesso. Quem lida com dados de saúde
          confirma também com o código do aplicativo.
        </p>
      </div>
      {aviso ? <FaixaAlerta variante="info" titulo={aviso} /> : null}

      {forma.tipo === "senha" ? (
        <FormularioEntrar proximo={proximo} />
      ) : (
        <section
          aria-labelledby="titulo-seletor"
          className="flex flex-col gap-4"
        >
          <FaixaAlerta variante="info" titulo="Modo demonstração">
            Dados fictícios, só neste computador. Escolha com quem entrar; nada
            aqui toca o banco de verdade.
          </FaixaAlerta>
          <h2
            id="titulo-seletor"
            className="font-titulo text-2 text-texto font-medium"
          >
            Entrar como
          </h2>
          <ul className="flex flex-col gap-2">
            {forma.opcoes.map((opcao) => (
              <li key={opcao.usuarioId}>
                <form action={entrarPorSeletor}>
                  <input
                    type="hidden"
                    name="usuarioId"
                    value={opcao.usuarioId}
                  />
                  {proximo ? (
                    <input type="hidden" name="proximo" value={proximo} />
                  ) : null}
                  <button
                    type="submit"
                    className="rounded-3 bg-[image:var(--brilho-superficie)] shadow-1 hover:shadow-halo ease-estado min-h-toque-campo flex w-full items-center gap-3 px-3 py-3 text-left transition-[box-shadow,transform] duration-140 active:scale-[0.99]"
                  >
                    <TileIcone tom="argila" forma="quadrado">
                      <UserRound />
                    </TileIcone>
                    <span className="flex flex-col">
                      <span className="text-corpo text-texto font-semibold">
                        {descreverPapeis(opcao.papeis)}
                      </span>
                      <span className="text-apoio text-texto-2">
                        {opcao.nome}
                      </span>
                    </span>
                  </button>
                </form>
              </li>
            ))}
          </ul>
        </section>
      )}

      <p className="text-apoio text-texto-2 border-texto/10 flex items-start gap-2 border-t pt-4">
        <Lock
          aria-hidden="true"
          className="mt-0.5 size-4 shrink-0"
          strokeWidth={1.75}
        />
        <span>{TEXTO_LGPD}</span>
      </p>
    </>
  );
}
