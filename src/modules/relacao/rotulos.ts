import { ROTULO_ORIGEM_LEAD } from "@/modules/crm/pipeline/estagios";
import type {
  EspecialidadeMedico,
  EstadoCandidata,
  EstadoParceiro,
  OrigemLead,
} from "@/lib/dados/tipos-relacao";

/** Nome de cada origem de lead: os mesmos rótulos do pipeline e da ficha. */
export const ROTULO_ORIGEM: Record<OrigemLead, string> = ROTULO_ORIGEM_LEAD;

/** Origens que um canal de captação pode gravar (a desconhecida fica de fora). */
export const ORIGENS_DE_CANAL: OrigemLead[] = [
  "instagram_organico",
  "meta_ads",
  "google",
  "site",
  "evento",
  "outro",
];

export const ROTULO_ESPECIALIDADE: Record<EspecialidadeMedico, string> = {
  obstetra: "Obstetra",
  pediatra: "Pediatra",
  outro: "Outra especialidade",
};

export const ROTULO_ESTADO_PARCEIRO: Record<EstadoParceiro, string> = {
  prospeccao: "Em conversa inicial",
  ativo: "Parceiro ativo",
  pausado: "Pausado",
  encerrado: "Encerrado",
};

export const ROTULO_ESTADO_CANDIDATA: Record<EstadoCandidata, string> = {
  nova: "Nova",
  em_triagem: "Em triagem",
  entrevista_agendada: "Entrevista agendada",
  entrevistada: "Entrevistada",
  aprovada: "Aprovada",
  banco_reserva: "Banco de reserva",
  nao_seguiu: "Não seguiu",
  desistiu: "Desistiu",
};

/** Nome da equipe (papel responsável) nas telas de tarefas. */
export const ROTULO_EQUIPE: Record<string, string> = {
  diretoria: "Diretoria",
  coordenacao: "Coordenação",
  comercial: "Comercial",
  financeiro: "Financeiro",
  marketing: "Marketing",
  enfermeira: "Enfermagem",
  sem_equipe: "Sem equipe definida",
};

export const ROTULO_PAPEL_ALVO: Record<string, string> = {
  comercial: "Comercial",
  enfermeira: "Enfermagem",
  financeiro: "Financeiro",
  marketing: "Marketing",
  coordenacao: "Coordenação",
  diretoria: "Diretoria",
};

/** Por que a tarefa existe, em frase, para o painel de detalhes. */
export const ROTULO_ORIGEM_TAREFA: Record<string, string> = {
  nutricao_contato: "Régua de nutrição: hora de falar com a família de novo",
  followup_comercial: "Acompanhamento comercial de uma conversa em andamento",
  agendar_sessao: "Marcar a sessão de venda com a família",
  enviar_formulario_contrato: "Enviar o formulário do contrato",
  checkin_dpp: "Confirmar como a família está perto da data prevista",
  agendar_prenatal: "Marcar a consulta pré-natal",
  designar_profissional: "Escolher a profissional que vai atender a família",
  obter_contato_medico: "Conseguir o contato do médico da família",
  emitir_evolucao: "Emitir a evolução do atendimento",
  escuta_neutro: "Escuta atenta, sem oferta, em um momento delicado",
  enviar_pesquisa: "Enviar a pesquisa de satisfação",
  enviar_guia: "Enviar o guia para a família",
  cobranca_atraso: "Cobrança em atraso",
  documento_vencendo: "Documento perto de vencer",
  registrar_desfecho_sessao: "Registrar como terminou a sessão de venda",
  responder_consulta_isadora: "Responder uma consulta que a Isadora encaminhou",
  outro: "Tarefa avulsa, aberta por alguém da equipe ou pelo sistema",
};
