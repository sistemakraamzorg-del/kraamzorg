import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import type { Papel } from "../../../src/lib/auth/papeis";
import { montarTour, type Passo } from "../../../src/modules/tour/montar";
import { entrarComo, semRolagemLateral } from "../apoio/entrar";

/**
 * Tour guiado (src/modules/tour): para cada perfil de demonstração, abre o
 * tour por `?tour=1` e anda até o fim pelo botão Próximo, conferindo o
 * título de cada passo contra `montarTour` do papel, a tela de cada passo e
 * a ausência de rolagem lateral. No meio do caminho, o axe roda só dentro
 * do cartão do tour (o axe da página inteira tem achados antigos do visual
 * DashCore, fora deste trabalho). Roda no celular e no computador.
 */

const PERFIS: { rotulo: string; papel: Papel }[] = [
  { rotulo: "Comercial", papel: "comercial" },
  { rotulo: "Coordenação", papel: "coordenacao" },
  { rotulo: "Diretoria", papel: "diretoria" },
  { rotulo: "Financeiro", papel: "financeiro" },
  { rotulo: "Marketing", papel: "marketing" },
  { rotulo: "Enfermeira", papel: "enfermeira" },
];

/** O cartão do tour (em `next dev`, a camada de erro do Next também é um diálogo). */
const CARTAO = "[role=dialog][aria-labelledby][data-tour-cartao]";

/**
 * Telas que já rolam de lado no celular antes do tour, por um balão de
 * gráfico ou uma tabela que passa da borda (achado anterior a este
 * trabalho, registrado em docs/sessoes/tour-guiado.md). Nelas o teste confere
 * só que o tour não aumenta a rolagem: o cartão fica dentro da tela.
 */
const ROLAGEM_ANTIGA: Partial<Record<Papel, string[]>> = {
  financeiro: ["/inicio"],
  coordenacao: ["/pos-venda"],
  diretoria: ["/pos-venda", "/painel"],
};

async function semRolagemLateralNoTour(page: Page, papel: Papel) {
  const caminho = new URL(page.url()).pathname;
  const cartaoDentro = await page.evaluate(() => {
    const largura = document.documentElement.clientWidth;
    return [
      ...document.querySelectorAll("[data-tour-cartao], [data-tour-convite]"),
    ].every((el) => {
      const r = el.getBoundingClientRect();
      return r.left >= -0.5 && r.right <= largura + 0.5;
    });
  });
  expect(cartaoDentro, `cartão do tour dentro da tela em ${caminho}`).toBe(
    true,
  );
  if (!(ROLAGEM_ANTIGA[papel] ?? []).includes(caminho)) {
    await semRolagemLateral(page);
  }
}

function escapar(texto: string): string {
  return texto.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** A tela do passo: o caminho dele, ou a tela onde ele mora (transferências levam a Conversas). */
function telaEsperada(passo: Passo): RegExp {
  const caminhos = [passo.caminho, passo.alvoDoMenu].filter(
    (c): c is string => !!c && c.startsWith("/"),
  );
  return new RegExp(`(${caminhos.map(escapar).join("|")})(/[^?]*)?(\\?.*)?$`);
}

/**
 * Chamadas do mini-tour sem o elemento na tela de demonstração (lista
 * vazia): o cartão fica no centro, sem destaque. Toda outra chamada precisa
 * achar o seu `data-tour` na tela.
 */
const SEM_ALVO_NA_DEMONSTRACAO: Partial<Record<Papel, string[]>> = {
  // O marketing não tem manual publicado nos dados de demonstração.
  marketing: ["detalhe:manuais:leitura", "detalhe:manuais:lista"],
};

async function axeNoCartao(page: Page): Promise<void> {
  const resultado = await new AxeBuilder({ page }).include(CARTAO).analyze();
  const graves = resultado.violations.filter(
    (v) => v.impact === "serious" || v.impact === "critical",
  );
  expect(graves, JSON.stringify(graves, null, 2)).toEqual([]);
}

for (const perfil of PERFIS) {
  test(`${perfil.rotulo}: percorre o tour inteiro, passo a passo`, async ({
    page,
  }) => {
    test.setTimeout(420_000);
    const passos = montarTour([perfil.papel]);
    await entrarComo(page, perfil.rotulo);
    const inicio = new URL(page.url()).pathname;
    await page.goto(`${inicio}?tour=1`);

    const cartao = page.locator(CARTAO);
    const meio = Math.floor(passos.length / 2);

    for (const [i, passo] of passos.entries()) {
      await expect(cartao.getByRole("heading", { level: 2 })).toHaveText(
        passo.titulo,
      );
      await expect(cartao).toContainText(`Passo ${i + 1} de ${passos.length}`);
      await expect(cartao).toBeFocused();
      if (passo.tipo !== "abertura" && passo.caminho) {
        await expect(page).toHaveURL(telaEsperada(passo));
      }
      await semRolagemLateralNoTour(page, perfil.papel);
      if (passo.alvoNaTela) {
        const semAlvo = (SEM_ALVO_NA_DEMONSTRACAO[perfil.papel] ?? []).includes(
          passo.id,
        );
        // O destaque acende em volta do elemento da tela (ou não, quando a
        // lista está vazia).
        await expect(
          page.locator("[data-tour-destaque]"),
          `destaque de ${passo.id}`,
        ).toHaveCount(semAlvo ? 0 : 1);
      }
      if (i === 0 || i === meio || i === passos.length - 1) {
        await axeNoCartao(page);
      }

      const ultimo = i === passos.length - 1;
      await cartao
        .getByRole("button", {
          name: ultimo ? "Concluir" : i === 0 ? /^Começar/ : /^Próximo/,
        })
        .click();
    }

    await expect(cartao).toHaveCount(0);
  });
}

test("Esc fecha o tour e as setas navegam", async ({ page }) => {
  const passos = montarTour(["comercial"]);
  await entrarComo(page, "Comercial");
  await page.goto("/inicio?tour=1");
  const cartao = page.locator(CARTAO);
  await expect(cartao.getByRole("heading", { level: 2 })).toHaveText(
    passos[0]!.titulo,
  );
  await page.keyboard.press("ArrowRight");
  await expect(cartao.getByRole("heading", { level: 2 })).toHaveText(
    passos[1]!.titulo,
  );
  await page.keyboard.press("ArrowLeft");
  await expect(cartao.getByRole("heading", { level: 2 })).toHaveText(
    passos[0]!.titulo,
  );
  await page.keyboard.press("Escape");
  await expect(cartao).toHaveCount(0);
});

test.describe("convite da primeira entrada", () => {
  test.beforeEach(async ({ page }) => {
    // O convite não aparece para navegador conduzido por robô (para não
    // cobrir a tela dos outros testes): aqui o teste se passa por pessoa.
    await page.addInitScript(() => {
      Object.defineProperty(Navigator.prototype, "webdriver", {
        get: () => false,
        configurable: true,
      });
    });
  });

  test("aparece na tela inicial, Agora não o some e ele não volta ao recarregar", async ({
    page,
  }) => {
    await entrarComo(page, "Comercial");
    const convite = page.getByRole("region", {
      name: /Quer conhecer o sistema em \d+ minutos?\?/,
    });
    await expect(convite).toBeVisible();
    await semRolagemLateral(page);
    // Não abre o tour sozinho.
    await expect(page.locator(CARTAO)).toHaveCount(0);

    await convite.getByRole("button", { name: "Agora não" }).click();
    await expect(convite).toHaveCount(0);

    await page.reload();
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await expect(
      page.getByRole("region", { name: /Quer conhecer o sistema/ }),
    ).toHaveCount(0);
  });

  test("Começar o tour abre o primeiro passo", async ({ page }) => {
    const passos = montarTour(["enfermeira"]);
    await entrarComo(page, "Enfermeira");
    await page
      .getByRole("region", { name: /Quer conhecer o sistema/ })
      .getByRole("button", { name: "Começar o tour" })
      .click();
    await expect(
      page.locator(CARTAO).getByRole("heading", { level: 2 }),
    ).toHaveText(passos[0]!.titulo);
  });
});
