import { describe, expect, it } from "vitest";
import { nomeDaMensagem } from "./nomes-mensagens";

/**
 * A tela de Configurações mostra um nome em português no lugar da chave
 * interna da mensagem (`regua_21_27`, `followup_d3`): ninguém da equipe
 * precisa ler código para achar o texto que quer editar.
 */
describe("nomeDaMensagem", () => {
  it("usa o nome escrito à mão para as chaves conhecidas", () => {
    expect(nomeDaMensagem("followup_d3")).toBe("Retorno depois de 3 dias");
    expect(nomeDaMensagem("perda")).toBe("Acolhimento depois de uma perda");
    expect(nomeDaMensagem("regua_21_27")).toBe(
      "Régua de nutrição: de 21 a 27 semanas",
    );
  });

  it("monta o nome pelo grupo da chave, com acento e sem sublinhado", () => {
    expect(nomeDaMensagem("formulario_ajuda_endereco")).toBe(
      "Formulário do contrato: ajuda endereço",
    );
    expect(nomeDaMensagem("portal_passo_prenatal")).toBe(
      "Portal da família: passo pré-natal",
    );
    expect(nomeDaMensagem("candidatura_titulo")).toBe(
      "Página de candidatura: título",
    );
  });

  it("chave desconhecida vira frase, nunca o código cru", () => {
    const nome = nomeDaMensagem("aviso_novo_qualquer");
    expect(nome).toBe("Aviso novo qualquer");
    expect(nome).not.toMatch(/_/);
  });

  it("nenhum nome de chave do sistema fica com sublinhado", () => {
    const chaves = [
      "alerta_saude",
      "followup_d14",
      "pos_sessao_48h",
      "pagamento_confirmado_34s",
      "grupo_reuniao_agendada",
      "instrucao_agenda_indisponivel",
      "captacao_verificacao_falhou",
      "portal_enfermeira_sem_designacao",
      "sessao_termo_gravacao",
    ];
    for (const chave of chaves) {
      expect(nomeDaMensagem(chave)).not.toMatch(/_/);
    }
  });
});
