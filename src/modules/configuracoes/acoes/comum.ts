import { ErroRepositorio } from "@/lib/dados/erros";

export interface EstadoFormulario {
  erro?: string;
  sucesso?: string;
}

/**
 * Traduz o `ErroRepositorio` para uma frase que diz o que aconteceu e o que
 * fazer (PRD 20.3). `contexto` nomeia quem tem permissão, para a mensagem
 * de `sem_permissao` ficar específica ("Só a diretoria...").
 */
export function traduzirErroPadrao(
  erro: unknown,
  quemPode = "A diretoria",
): string {
  if (erro instanceof ErroRepositorio) {
    switch (erro.codigo) {
      case "sem_permissao":
        return `${quemPode} faz essa alteração.`;
      case "nao_encontrado":
        return "Não achamos esse registro. Atualize a página e tente de novo.";
      case "recusado":
        return "A alteração não foi aceita. Confira os dados e tente de novo.";
      case "funcao_pendente":
        return "Esta ação ainda não está disponível no sistema. Nada foi alterado; avise a equipe técnica.";
      case "indisponivel":
        return "Sem conexão com o sistema agora. Tente de novo em instantes.";
      default:
        return "Não foi possível salvar agora. Tente de novo em instantes.";
    }
  }
  return "Não foi possível salvar agora. Tente de novo em instantes.";
}
