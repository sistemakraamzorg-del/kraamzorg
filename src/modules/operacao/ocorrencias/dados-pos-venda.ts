import "server-only";
import { ErroRepositorio } from "@/lib/dados/erros";
import { obterRepositorios } from "@/lib/dados/fabrica";
import type { ListaPosVenda } from "@/lib/dados/tipos-ocorrencia";
import { serieNpsMensal, type SerieNps } from "@/lib/gestao/nps-mensal";
import { hojeBrasilia } from "@/modules/crm/pipeline/idade-gestacional";

/** Quantos meses o gráfico de NPS mostra, terminando no mês atual. */
const MESES_DO_NPS = 6;

/** Dados da tela do pós-venda, pipeline 4 (P42). Coordenação e diretoria, AAL2, conferido no banco. */
export type TelaPosVenda =
  | { situacao: "sem_permissao" }
  | { situacao: "ok"; lista: ListaPosVenda; npsMensal: SerieNps | null };

export function situacaoPosVenda(
  valor: string | undefined,
): "abertos" | "todos" {
  return valor === "todos" ? "todos" : "abertos";
}

export async function obterTelaPosVenda(
  situacao: "abertos" | "todos",
): Promise<TelaPosVenda> {
  const { posVenda, gestao } = await obterRepositorios();
  try {
    const lista = await posVenda.listar(situacao);
    // O histórico mensal usa todas as pesquisas, não só as da lista filtrada.
    let npsMensal: SerieNps | null = null;
    try {
      const { itens } = await posVenda.listar("todos");
      // A amostra mínima é a que o Painel executivo já usa; sem acesso a ele,
      // o mês aparece com qualquer resposta e o gráfico diz quantas foram.
      let amostraMinima = 1;
      try {
        amostraMinima = (await gestao.painelExecutivo(null)).experiencia
          .amostraMinima;
      } catch {
        amostraMinima = 1;
      }
      npsMensal = serieNpsMensal(
        itens,
        `${hojeBrasilia().slice(0, 7)}-01`,
        MESES_DO_NPS,
        amostraMinima,
      );
    } catch {
      npsMensal = null;
    }
    return { situacao: "ok", lista, npsMensal };
  } catch (erro) {
    if (erro instanceof ErroRepositorio && erro.codigo === "sem_permissao") {
      return { situacao: "sem_permissao" };
    }
    throw erro;
  }
}
