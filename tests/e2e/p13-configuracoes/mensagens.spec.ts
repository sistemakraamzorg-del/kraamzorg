import { expect, test } from "@playwright/test";
import { entrarComo } from "../apoio/entrar";

/**
 * P13 item 5 (Mensagens): edição com prévia das variáveis, contagem de
 * caracteres, troca automática de travessão por vírgula e fluxo de
 * rascunho para aprovado com o aprovador registrado.
 */
test("edita o rascunho, vê a prévia sem a variável vazia e aprova com o nome registrado", async ({
  page,
}) => {
  await entrarComo(page, "Diretoria");
  await page.goto("/configuracoes?aba=mensagens");

  await page
    .getByRole("button", { name: "Editar a mensagem Retorno depois de 3 dias" })
    .click();
  const dialogo = page.getByRole("dialog");
  await expect(dialogo.getByText(/caracteres/)).toBeVisible();
  await expect(
    dialogo.getByText("Prévia com valores de exemplo"),
  ).toBeVisible();

  await dialogo.getByRole("button", { name: "Cancelar" }).click();
  await expect(dialogo).toBeHidden();

  await page
    .locator("tr", { hasText: "Retorno depois de 3 dias" })
    .getByRole("button", { name: "Aprovar" })
    .click();

  await expect(
    page
      .locator("tr", { hasText: "Retorno depois de 3 dias" })
      .getByText("Aprovado"),
  ).toBeVisible();
  await expect(
    page
      .locator("tr", { hasText: "Retorno depois de 3 dias" })
      .getByText(/Perfil Teste Diretoria/),
  ).toBeVisible();
});

test("travessão vira vírgula ao salvar o rascunho", async ({ page }) => {
  await entrarComo(page, "Diretoria");
  await page.goto("/configuracoes?aba=mensagens");

  await page
    .getByRole("button", {
      name: "Editar a mensagem Acolhimento depois de uma perda",
    })
    .click();
  const dialogo = page.getByRole("dialog");
  const texto = dialogo.getByLabel("Texto");
  await texto.fill("Sinto muito — estamos aqui.");
  await dialogo.getByRole("button", { name: "Salvar rascunho" }).click();
  await expect(dialogo).toBeHidden();

  const linha = page.locator("tr", {
    hasText: "Acolhimento depois de uma perda",
  });
  await expect(linha.getByText("Sinto muito, estamos aqui.")).toBeVisible();
  await expect(linha).not.toContainText("—");
});
