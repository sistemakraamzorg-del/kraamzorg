import type { Metadata } from "next";
import { PaginaNaoEncontrada } from "@/components/shell/pagina-nao-encontrada";

export const metadata: Metadata = {
  title: "Página não encontrada · Kraamzorg OS",
};

/**
 * Endereço que não existe em lugar nenhum do sistema. Fica fora da casca do
 * painel; "/" leva quem entrou para a tela inicial do papel e quem não entrou
 * para a tela de entrar.
 */
export default function NaoEncontrada() {
  return (
    <main className="bg-fundo mx-auto flex w-full max-w-[640px] flex-1 flex-col px-4 py-10">
      <PaginaNaoEncontrada />
    </main>
  );
}
