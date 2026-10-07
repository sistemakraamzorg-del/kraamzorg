import Link from "next/link";
import { FolhaLupa } from "@/components/ilustracoes";
import { Botao } from "@/components/ui/botao";
import { EstadoVazio } from "@/components/ui/estado-vazio";

/**
 * O que aparece quando o endereço não leva a nada: um link antigo, uma
 * família que foi unida a outro cadastro, uma cobrança que já não existe.
 * Em português, sem o "404" do Next, e com o caminho de volta.
 */
export function PaginaNaoEncontrada({
  voltarPara = "/",
}: {
  /** Tela inicial de quem está vendo ("/" manda cada papel para a sua). */
  voltarPara?: string;
}) {
  return (
    <div className="pt-6">
      <EstadoVazio
        nivelTitulo="h2"
        ilustracao={<FolhaLupa tamanho={112} />}
        titulo="Esta página não existe mais"
        texto="O link pode ser antigo ou o registro pode ter sido unido a outro cadastro. Volte para a tela inicial e procure pelo menu ou pela busca."
        acao={
          <Botao asChild variante="secundario" tamanho="compacto">
            <Link href={voltarPara}>Voltar para a tela inicial</Link>
          </Botao>
        }
      />
    </div>
  );
}
