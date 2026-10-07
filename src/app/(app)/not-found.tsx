import { PaginaNaoEncontrada } from "@/components/shell/pagina-nao-encontrada";

/** Endereço do painel que não leva a nada: a casca continua, com o caminho de volta. */
export default function NaoEncontradaPainel() {
  return <PaginaNaoEncontrada voltarPara="/inicio" />;
}
