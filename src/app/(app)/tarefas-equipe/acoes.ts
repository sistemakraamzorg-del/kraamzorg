"use server";

import { revalidatePath } from "next/cache";
import { exigirSessao } from "@/lib/auth/sessao";
import { codigoTarefa, ErroRepositorio } from "@/lib/dados/erros";
import { obterRepositorios } from "@/lib/dados/fabrica";

export interface ResultadoTarefaEquipe {
  erro?: string;
  /** A atualização do banco (0046) ainda não foi aplicada. */
  pendente?: boolean;
}

/** Dito no quadro quando a função do banco ainda não existe. */
const AVISO_FUNCAO_PENDENTE =
  "Esta ação ainda não foi liberada no banco. A equipe técnica precisa aplicar a atualização.";

const FRASE_POR_CODIGO: Record<string, string> = {
  titulo_invalido: "Dê um título à tarefa, com 3 a 120 letras.",
  so_para_voce:
    "Você pode criar tarefas só para você. Para outra pessoa, peça à coordenação.",
  responsavel_invalido: "Essa pessoa não está ativa no sistema. Escolha outra.",
  familia_invalida:
    "Não encontramos essa família. Escolha outra ou deixe em branco.",
  familia_fora_do_alcance: "Essa família não está entre as que você acompanha.",
  nao_encontrada: "Essa tarefa não existe mais. Atualize a tela.",
  sem_permissao:
    "Essa tarefa é de outra pessoa ou equipe. Só quem cuida dela, a coordenação ou a diretoria mexe. Nada foi alterado.",
  tarefa_encerrada: "Essa tarefa já foi encerrada. Atualize a tela.",
  estado_invalido: "Esse estado não é permitido por aqui.",
};

function traduzir(erro: unknown, padrao: string): ResultadoTarefaEquipe {
  if (erro instanceof ErroRepositorio) {
    if (erro.codigo === "funcao_pendente")
      return { erro: AVISO_FUNCAO_PENDENTE, pendente: true };
    const frase = FRASE_POR_CODIGO[codigoTarefa(erro) ?? ""];
    if (frase) return { erro: frase };
    if (erro.codigo === "sem_permissao")
      return { erro: FRASE_POR_CODIGO.sem_permissao };
    if (erro.codigo === "nao_encontrado")
      return { erro: FRASE_POR_CODIGO.nao_encontrada };
  }
  return { erro: padrao };
}

function atualizar() {
  revalidatePath("/tarefas-equipe");
  revalidatePath("/tarefas");
}

/**
 * Conclui uma tarefa a partir do quadro por equipe: `tarefas.concluirTarefa`,
 * a mesma da tela Tarefas (api.tarefa_concluir; a coordenação também pode).
 */
export async function concluirTarefaDoQuadro(
  tarefaId: string,
): Promise<ResultadoTarefaEquipe> {
  await exigirSessao("/tarefas-equipe");
  if (!tarefaId) return { erro: "Não deu para saber qual tarefa é essa." };
  try {
    const { tarefas } = await obterRepositorios();
    await tarefas.concluirTarefa(tarefaId);
  } catch (erro) {
    return traduzir(
      erro,
      "Não foi possível concluir agora. A tarefa continua onde estava. Tente de novo em instantes.",
    );
  }
  atualizar();
  return {};
}

export async function mudarEstadoTarefaDoQuadro(
  tarefaId: string,
  status: "aberta" | "em_andamento",
): Promise<ResultadoTarefaEquipe> {
  await exigirSessao("/tarefas-equipe");
  if (!tarefaId || (status !== "aberta" && status !== "em_andamento"))
    return { erro: "Não deu para saber qual tarefa é essa." };
  try {
    const { relacao } = await obterRepositorios();
    await relacao.tarefasEquipe.mudarEstado(tarefaId, status);
  } catch (erro) {
    return traduzir(
      erro,
      "Não foi possível mudar o estado agora. A tarefa ficou onde estava. Tente de novo em instantes.",
    );
  }
  atualizar();
  return {};
}

export async function atribuirTarefaDoQuadro(
  tarefaId: string,
  responsavelId: string,
): Promise<ResultadoTarefaEquipe> {
  await exigirSessao("/tarefas-equipe");
  if (!tarefaId || !responsavelId)
    return { erro: "Escolha a pessoa que vai cuidar da tarefa." };
  try {
    const { relacao } = await obterRepositorios();
    await relacao.tarefasEquipe.atribuir(tarefaId, responsavelId);
  } catch (erro) {
    return traduzir(
      erro,
      "Não foi possível atribuir agora. Nada foi alterado. Tente de novo em instantes.",
    );
  }
  atualizar();
  return {};
}

export async function criarTarefaDoQuadro(dados: {
  titulo: string;
  responsavelId: string;
  familiaId: string;
  /** Data do prazo, aaaa-mm-dd; vazio = sem prazo. */
  prazo: string;
}): Promise<ResultadoTarefaEquipe> {
  await exigirSessao("/tarefas-equipe");
  const titulo = dados.titulo.trim();
  if (titulo.length < 3 || titulo.length > 120)
    return { erro: FRASE_POR_CODIGO.titulo_invalido };
  if (dados.prazo && !/^\d{4}-\d{2}-\d{2}$/.test(dados.prazo))
    return { erro: "O prazo não está em uma data válida." };
  try {
    const { relacao } = await obterRepositorios();
    await relacao.tarefasEquipe.criar({
      titulo,
      responsavelId: dados.responsavelId || null,
      familiaId: dados.familiaId || null,
      // Fim do dia em Brasília (UTC-3, sem horário de verão desde 2019).
      venceEm: dados.prazo ? `${dados.prazo}T23:59:00-03:00` : null,
    });
  } catch (erro) {
    return traduzir(
      erro,
      "Não foi possível criar a tarefa agora. Nada foi salvo. Tente de novo em instantes.",
    );
  }
  atualizar();
  return {};
}
