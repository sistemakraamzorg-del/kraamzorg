import { PaginaNaoEncontrada } from "@/components/shell/pagina-nao-encontrada";

/** Endereço do portal da enfermeira que não leva a nada. */
export default function NaoEncontradaPortal() {
  return <PaginaNaoEncontrada voltarPara="/hoje" />;
}
