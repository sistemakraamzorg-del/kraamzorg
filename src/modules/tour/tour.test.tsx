import { act, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Papel } from "@/lib/auth/papeis";

const empurrar = vi.fn();
let caminho = "/inicio";
let busca = new URLSearchParams();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: empurrar, replace: vi.fn(), refresh: vi.fn() }),
  usePathname: () => caminho,
  useSearchParams: () => busca,
}));

import { BotaoFazerTour } from "./botao-fazer-tour";
import { CHAVE_ANDAMENTO, chaveConvite, esquecerMemoriaDoTour } from "./estado";
import { montarTour } from "./montar";
import { VERSAO_TOUR } from "./passos";
import { ProvedorTour } from "./provedor-tour";

const USUARIO = "00000000-0000-4000-8001-000000000001";

function montar(papeis: Papel[] = ["comercial"]) {
  return render(
    <ProvedorTour papeis={papeis} usuarioId={USUARIO}>
      <main id="conteudo" tabIndex={-1}>
        <BotaoFazerTour variante="lista" />
      </main>
    </ProvedorTour>,
  );
}

const dialogo = () => screen.getByRole("dialog");
const titulo = () => dialogo().querySelector("h2")?.textContent;

beforeEach(() => {
  localStorage.clear();
  sessionStorage.clear();
  esquecerMemoriaDoTour();
  empurrar.mockReset();
  caminho = "/inicio";
  busca = new URLSearchParams();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("tour guiado", () => {
  const passos = montarTour(["comercial"]);

  it("abre pelo botão, põe o foco no cartão e anuncia o passo", async () => {
    const usuario = userEvent.setup();
    montar();
    await usuario.click(screen.getByRole("button", { name: /Fazer o tour/ }));

    const cartao = dialogo();
    expect(cartao).toHaveAttribute("aria-modal", "false");
    expect(cartao).toHaveAccessibleName(passos[0]!.titulo);
    expect(cartao).toHaveAccessibleDescription(passos[0]!.serve);
    expect(cartao).toHaveFocus();
    expect(
      screen.getByText(`Passo 1 de ${passos.length}: ${passos[0]!.titulo}`),
    ).toBeInTheDocument();
    // Começar o tour já responde ao convite da primeira entrada.
    expect(localStorage.getItem(chaveConvite(USUARIO))).toBe("iniciado");
  });

  it("avança e volta, e navega para a tela de cada passo", async () => {
    const usuario = userEvent.setup();
    montar();
    await usuario.click(screen.getByRole("button", { name: /Fazer o tour/ }));
    await usuario.click(screen.getByRole("button", { name: /Começar/ }));
    expect(titulo()).toBe(passos[1]!.titulo);
    // O passo 1 é o Início, a tela atual: não navega.
    expect(empurrar).not.toHaveBeenCalled();

    // As chamadas do Início ficam na mesma tela; o primeiro passo de outra
    // tela navega para ela.
    const outraTela = passos.findIndex(
      (p, i) => i > 1 && p.caminho && p.caminho !== "/inicio",
    );
    for (let i = 2; i <= outraTela; i++) {
      await usuario.click(screen.getByRole("button", { name: /Próximo/ }));
      expect(titulo()).toBe(passos[i]!.titulo);
      if (i < outraTela) expect(empurrar).not.toHaveBeenCalled();
    }
    expect(empurrar).toHaveBeenCalledWith(passos[outraTela]!.caminho);
    expect(dialogo()).toHaveFocus();

    await usuario.click(screen.getByRole("button", { name: /Voltar/ }));
    expect(titulo()).toBe(passos[outraTela - 1]!.titulo);
  });

  it("as setas do teclado navegam e Esc fecha, devolvendo o foco a quem abriu", async () => {
    const usuario = userEvent.setup();
    montar();
    const botao = screen.getByRole("button", { name: /Fazer o tour/ });
    await usuario.click(botao);

    fireEvent.keyDown(dialogo(), { key: "ArrowRight" });
    expect(titulo()).toBe(passos[1]!.titulo);
    fireEvent.keyDown(dialogo(), { key: "ArrowRight" });
    expect(titulo()).toBe(passos[2]!.titulo);
    fireEvent.keyDown(dialogo(), { key: "ArrowLeft" });
    expect(titulo()).toBe(passos[1]!.titulo);

    fireEvent.keyDown(dialogo(), { key: "Escape" });
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(localStorage.getItem(chaveConvite(USUARIO))).toBe("dispensado");
    expect(sessionStorage.getItem(CHAVE_ANDAMENTO)).toBeNull();
    await act(() => new Promise((r) => setTimeout(r, 5)));
    expect(botao).toHaveFocus();
  });

  it("Pular fecha o tour e grava que foi dispensado", async () => {
    const usuario = userEvent.setup();
    montar();
    await usuario.click(screen.getByRole("button", { name: /Fazer o tour/ }));
    await usuario.click(screen.getByRole("button", { name: "Pular o tour" }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(localStorage.getItem(chaveConvite(USUARIO))).toBe("dispensado");
  });

  it("no último passo, Concluir fecha e grava que foi concluído; Rever o tour volta ao começo", async () => {
    const usuario = userEvent.setup();
    sessionStorage.setItem(
      CHAVE_ANDAMENTO,
      JSON.stringify({
        usuarioId: USUARIO,
        versao: VERSAO_TOUR,
        total: passos.length,
        indice: passos.length - 1,
        caminho: null,
      }),
    );
    montar();
    expect(titulo()).toBe(passos.at(-1)!.titulo);
    expect(
      screen.queryByRole("button", { name: "Pular o tour" }),
    ).not.toBeInTheDocument();

    await usuario.click(screen.getByRole("button", { name: /Rever o tour/ }));
    expect(titulo()).toBe(passos[0]!.titulo);

    fireEvent.keyDown(dialogo(), { key: "ArrowLeft" });
    expect(titulo()).toBe(passos[0]!.titulo);
  });

  it("retoma o passo guardado (troca de casca) e conclui no fim", async () => {
    const usuario = userEvent.setup();
    sessionStorage.setItem(
      CHAVE_ANDAMENTO,
      JSON.stringify({
        usuarioId: USUARIO,
        versao: VERSAO_TOUR,
        total: passos.length,
        indice: passos.length - 1,
        caminho: null,
      }),
    );
    montar();
    await usuario.click(screen.getByRole("button", { name: "Concluir" }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(localStorage.getItem(chaveConvite(USUARIO))).toBe("concluido");
  });

  it("não retoma o andamento de outra pessoa", () => {
    sessionStorage.setItem(
      CHAVE_ANDAMENTO,
      JSON.stringify({
        usuarioId: "outra-pessoa",
        versao: VERSAO_TOUR,
        total: passos.length,
        indice: 3,
        caminho: null,
      }),
    );
    montar();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("?tour=1 começa o tour", () => {
    busca = new URLSearchParams("tour=1");
    montar();
    expect(titulo()).toBe(passos[0]!.titulo);
  });

  it("o convite aparece na tela inicial, Agora não o some e ele não volta", async () => {
    const usuario = userEvent.setup();
    const { unmount } = montar();
    const convite = screen.getByRole("region", {
      name: /Quer conhecer o sistema/,
    });
    expect(convite).toBeInTheDocument();
    // Não puxa o foco nem abre o tour sozinho.
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();

    await usuario.click(screen.getByRole("button", { name: "Agora não" }));
    expect(
      screen.queryByRole("region", { name: /Quer conhecer o sistema/ }),
    ).not.toBeInTheDocument();
    expect(localStorage.getItem(chaveConvite(USUARIO))).toBe("dispensado");

    unmount();
    esquecerMemoriaDoTour();
    montar();
    expect(
      screen.queryByRole("region", { name: /Quer conhecer o sistema/ }),
    ).not.toBeInTheDocument();
  });

  it("o convite não aparece para navegador conduzido por robô", () => {
    Object.defineProperty(window.navigator, "webdriver", {
      value: true,
      configurable: true,
    });
    try {
      montar();
      expect(
        screen.queryByRole("region", { name: /Quer conhecer o sistema/ }),
      ).not.toBeInTheDocument();
    } finally {
      Reflect.deleteProperty(window.navigator, "webdriver");
    }
  });

  it("o convite não aparece fora da tela inicial", () => {
    caminho = "/pipeline";
    montar();
    expect(
      screen.queryByRole("region", { name: /Quer conhecer o sistema/ }),
    ).not.toBeInTheDocument();
  });

  it("Começar o tour pelo convite abre o tour", async () => {
    const usuario = userEvent.setup();
    montar();
    await usuario.click(screen.getByRole("button", { name: "Começar o tour" }));
    expect(titulo()).toBe(passos[0]!.titulo);
    expect(
      screen.queryByRole("region", { name: /Quer conhecer o sistema/ }),
    ).not.toBeInTheDocument();
  });

  it("funciona sem armazenamento do navegador", async () => {
    const usuario = userEvent.setup();
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("bloqueado");
    });
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("bloqueado");
    });
    montar();
    await usuario.click(screen.getByRole("button", { name: /Fazer o tour/ }));
    await usuario.click(screen.getByRole("button", { name: /Começar/ }));
    expect(titulo()).toBe(passos[1]!.titulo);
    await usuario.click(screen.getByRole("button", { name: "Pular o tour" }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("o tour da enfermeira tem o passo do checklist, numerado", async () => {
    const usuario = userEvent.setup();
    caminho = "/hoje";
    montar(["enfermeira"]);
    await usuario.click(screen.getByRole("button", { name: /Fazer o tour/ }));
    const checklist = montarTour(["enfermeira"]).findIndex(
      (p) => p.id === "checklist-visita",
    );
    for (let i = 0; i < checklist; i++) {
      fireEvent.keyDown(dialogo(), { key: "ArrowRight" });
    }
    expect(titulo()).toBe("Checklist da visita");
    const lista = dialogo().querySelector("ol");
    expect(lista?.querySelectorAll("li")).toHaveLength(4);
    expect(lista).toHaveTextContent(/Cheguei/);
    expect(lista).toHaveTextContent(/Saí da casa/);
  });

  it("fora de uma casca com o tour, o botão não aparece", () => {
    render(<BotaoFazerTour variante="lateral" />);
    expect(
      screen.queryByRole("button", { name: /Fazer o tour/ }),
    ).not.toBeInTheDocument();
  });
});
