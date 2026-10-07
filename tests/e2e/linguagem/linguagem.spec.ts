import { expect, test } from "@playwright/test";
import { ROTAS, rotasPermitidas } from "../../../src/lib/navegacao";
import { entrarComo } from "../apoio/entrar";

/**
 * Revisão de linguagem e interface: nenhuma tela principal mostra valor cru
 * do banco ou da programação. Entra no modo demonstração como Diretoria (que
 * abre todas as telas do painel), passa por cada rota estática do menu e por
 * algumas abas, e lê `document.body.innerText`. Falha se achar `undefined`,
 * `NaN`, `null` solto, `[object ...]` ou uma palavra com sublinhado (como
 * `ficha_entregue` ou `em_conversa_ia`, o nome interno de um estado).
 *
 * Lê o texto que a pessoa vê, não o código: o mesmo valor de banco pode
 * chegar à tela por qualquer componente. As variáveis entre chaves das
 * mensagens editáveis ficam de fora.
 */

const ABAS_EXTRAS = [
  "/pipeline?pipeline=2",
  "/pipeline?pipeline=3",
  "/pipeline?pipeline=4",
  "/agente?aba=handoffs",
  "/agente?aba=solicitacoes",
  "/agente?aba=metricas",
  "/agente?aba=limites",
  "/configuracoes?aba=mensagens",
  "/configuracoes?aba=regua",
  "/configuracoes?aba=termos-alerta",
  "/configuracoes?aba=condicoes",
  "/marketing?aba=canais",
  "/evolucoes?situacao=todas",
  "/ocorrencias?situacao=todas",
];

const CAMINHOS = [
  ...[...rotasPermitidas(["diretoria"])].map((id) => ROTAS[id].caminho),
  ...ABAS_EXTRAS,
];

/** O que nunca deve aparecer como texto de tela. */
const PROIBIDOS: [nome: string, padrao: RegExp][] = [
  ["undefined", /\bundefined\b/],
  ["NaN", /\bNaN\b/],
  ["null solto", /(^|[\s(:])null($|[\s).,;])/m],
  ["[object ...]", /\[object\b/],
  ["palavra com sublinhado", /\b[\p{L}\d]+_[\p{L}\d_]+\b/u],
];

function achados(texto: string): string[] {
  // As variáveis das mensagens editáveis ({nome}, {quem_pediu}) ficam: quem
  // edita o texto precisa ver o nome da parte que é trocada no envio.
  const linhas = texto.replace(/\{[^{}\n]*\}/g, "{variável}").split("\n");
  const saida: string[] = [];
  for (const [nome, padrao] of PROIBIDOS) {
    for (const linha of linhas) {
      if (padrao.test(linha)) {
        saida.push(`${nome}: "${linha.trim().slice(0, 140)}"`);
      }
    }
  }
  return saida;
}

test.describe("sem valor cru de banco nas telas principais", () => {
  test.beforeEach(async ({ page }) => {
    await entrarComo(page, "Diretoria");
  });

  for (const caminho of CAMINHOS) {
    test(`${caminho} mostra só texto de gente`, async ({ page }) => {
      await page.goto(caminho);
      await page.waitForLoadState("networkidle");
      // Abre o que está recolhido: o texto de dentro também é texto de tela.
      await page.evaluate(() => {
        document.querySelectorAll("details").forEach((d) => {
          d.open = true;
        });
      });
      const texto = await page.evaluate(() => document.body.innerText);
      expect(texto.length, `a tela ${caminho} tem texto`).toBeGreaterThan(50);
      expect(achados(texto), `texto cru em ${caminho}`).toEqual([]);
    });
  }
});
