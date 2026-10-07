/**
 * Nome de cada mensagem na tela de Configurações. A chave
 * (`mensagem_modelo.chave`, como "regua_21_27") é o código que o sistema usa
 * para achar o texto; quem edita vê um nome em português. As chaves mais
 * usadas têm nome escrito à mão; as outras ganham um nome montado a partir do
 * grupo (o começo da chave) e das palavras que vêm depois.
 */

const NOMES: Record<string, string> = {
  alerta_saude: "Alerta de saúde para a família",
  alerta_saude_sensivel: "Alerta de saúde para família em estado sensível",
  alerta_internacao: "Aviso de internação",
  alerta_emocional: "Alerta de sofrimento emocional",
  perda: "Acolhimento depois de uma perda",
  fallback_confirmar:
    "Resposta quando a Isadora precisa confirmar com a equipe",
  midia_recebida: "Resposta a um arquivo recebido",
  audio_nao_transcrito: "Resposta a um áudio que não deu para ouvir",
  nao_lead_candidata: "Resposta a quem quer trabalhar na Kraamzorg",
  nao_lead_fornecedor: "Resposta a fornecedor ou parceiro",
  nao_lead_consultorio: "Resposta a quem procurava um consultório",
  followup_d1_pos_pdf: "Primeiro retorno depois da apresentação",
  followup_d1_pos_abertura: "Primeiro retorno depois da mensagem de abertura",
  followup_d3: "Retorno depois de 3 dias",
  followup_d14: "Retorno depois de 14 dias",
  sem_resposta_abertura_2: "Segunda tentativa quando não houve resposta",
  reuniao_confirmada: "Reunião com a Edilaine confirmada",
  horarios_sugeridos: "Horários sugeridos para a reunião",
  pedir_email_convite: "Pedido de e-mail para o convite da reunião",
  horario_ocupado: "Horário escolhido já ocupado",
  opcoes_vencidas: "Horários sugeridos que não valem mais",
  nenhum_horario_serve: "Quando nenhum horário serve",
  aguardando_horario_edilaine: "Esperando a Edilaine abrir um horário",
  horario_liberado: "Novo horário aberto pela Edilaine",
  agenda_falha_evento: "Quando a agenda falha",
  condicao_depois_da_reuniao: "Condição de pagamento só depois da reunião",
  reuniao_remarcada: "Reunião remarcada",
  lembrete_sessao: "Lembrete da reunião na véspera",
  nao_compareceu: "Quando a família não compareceu à reunião",
  pos_sessao_48h: "Retorno 48 horas depois da reunião",
  sessao_termo_gravacao: "Pedido para gravar a reunião",
  formulario_contrato: "Convite para o formulário do contrato",
  link_pagamento: "Link de pagamento",
  pagamento_confirmado: "Pagamento confirmado",
  pagamento_confirmado_34s: "Pagamento confirmado com 34 semanas ou mais",
  regua_ate_20: "Régua de nutrição: até 20 semanas",
  regua_21_27: "Régua de nutrição: de 21 a 27 semanas",
  regua_28_34: "Régua de nutrição: de 28 a 34 semanas",
  regua_35_mais: "Régua de nutrição: 35 semanas ou mais",
  regua_nasceu: "Régua de nutrição: bebê já nasceu",
  checkin_dpp: "Contato perto da data provável do parto",
  parabens_nascimento: "Parabéns pelo nascimento",
  alta_boas_vindas: "Boas-vindas em casa depois da alta",
  pesquisa_convite: "Convite para a pesquisa de satisfação",
  promotor_depoimento: "Pedido de depoimento",
  promotor_indicacao: "Pedido de indicação",
  email_evolucao_assunto: "E-mail da evolução: assunto",
  email_evolucao_corpo: "E-mail da evolução: texto",
};

/** O começo da chave diz de que parte do sistema a mensagem é. */
const GRUPOS: [prefixo: string, nome: string][] = [
  ["formulario_", "Formulário do contrato"],
  ["portal_", "Portal da família"],
  ["captacao_", "Página de contato"],
  ["candidatura_", "Página de candidatura"],
  ["regua_", "Régua de nutrição"],
  ["grupo_", "Aviso ao grupo da equipe"],
  ["instrucao_", "Instrução para a Isadora"],
  ["alerta_", "Alerta"],
  ["email_", "E-mail"],
  ["parceiros_", "Parceiros médicos"],
  ["sessao_", "Reunião com a Edilaine"],
  ["evolucao_", "Evolução"],
  ["pesquisa_", "Pesquisa de satisfação"],
];

/** Palavras da chave que perderam acento ou que precisam de outra forma. */
const PALAVRAS: Record<string, string> = {
  ate: "até",
  botao: "botão",
  conexao: "conexão",
  cpf: "CPF",
  designacao: "designação",
  dpp: "data provável do parto",
  email: "e-mail",
  endereco: "endereço",
  evolucoes: "evoluções",
  gravacao: "gravação",
  indisponivel: "indisponível",
  inicio: "início",
  invalido: "inválido",
  mais: "ou mais",
  nao: "não",
  orientacao: "orientação",
  pos: "depois de",
  prenatal: "pré-natal",
  sensivel: "sensível",
  sessao: "reunião",
  titulo: "título",
  vedacao: "vedação",
  verificacao: "verificação",
  whatsapp: "WhatsApp",
};

function palavra(p: string): string {
  if (/^d\d+$/.test(p)) return `${p.slice(1)} dias`;
  if (/^\d+s$/.test(p)) return `${p.slice(0, -1)} semanas`;
  if (/^\d+h$/.test(p)) return `${p.slice(0, -1)} horas`;
  return PALAVRAS[p] ?? p;
}

function frase(resto: string): string {
  const partes = resto
    .split("_")
    .filter(Boolean)
    .map(palavra)
    .join(" ")
    .replace(/\bboas vindas\b/, "boas-vindas")
    .replace(/(\d+) (\d+)/g, "$1 a $2");
  return partes;
}

function maiuscula(texto: string): string {
  return texto ? texto.charAt(0).toUpperCase() + texto.slice(1) : texto;
}

export function nomeDaMensagem(chave: string): string {
  const conhecido = NOMES[chave];
  if (conhecido) return conhecido;
  const grupo = GRUPOS.find(([prefixo]) => chave.startsWith(prefixo));
  if (grupo) {
    const resto = frase(chave.slice(grupo[0].length));
    return resto ? `${grupo[1]}: ${resto}` : grupo[1];
  }
  return maiuscula(frase(chave));
}
