import { describe, expect, it } from "vitest";
import { PAPEIS, type Papel } from "@/lib/auth/papeis";
import {
  abasDe,
  gruposDe,
  ROTAS,
  rotasPermitidas,
  type IdRota,
} from "@/lib/navegacao";
import { minutosDoTour, montarTour, rotasDoTour } from "./montar";
import { TELAS_EM_DETALHE, tituloDoTour } from "./passos";

const ROTAS_DO_PAINEL = (Object.keys(ROTAS) as IdRota[]).filter(
  (id) => ROTAS[id].casca === "app",
);
const ROTAS_DO_PORTAL = [...rotasPermitidas(["enfermeira"])];

function idsEmOrdem(passos: ReturnType<typeof montarTour>): IdRota[] {
  return rotasDoTour(passos);
}

describe("o tour de cada papel cobre só o que é dele (registro de navegação)", () => {
  it.each(PAPEIS.map((p) => [p]))(
    "%s: exatamente as telas que o papel abre, sem repetir, mais abertura e encerramento",
    (papel: Papel) => {
      const passos = montarTour([papel]);
      const rotas = idsEmOrdem(passos);
      expect(new Set(rotas).size).toBe(rotas.length);
      expect(new Set(rotas)).toEqual(rotasPermitidas([papel]));
      expect(passos[0]!.tipo).toBe("abertura");
      expect(passos.at(-1)!.tipo).toBe("encerramento");
      expect(passos.filter((p) => p.tipo === "abertura")).toHaveLength(1);
      expect(passos.filter((p) => p.tipo === "encerramento")).toHaveLength(1);
    },
  );

  it.each(PAPEIS.filter((p) => p !== "enfermeira").map((p) => [p]))(
    "%s: as telas da barra lateral vêm na ordem do menu",
    (papel: Papel) => {
      const rotas = idsEmOrdem(montarTour([papel]));
      const doMenu = gruposDe([papel]).flatMap((g) => g.itens.map((i) => i.id));
      expect(rotas.filter((id) => doMenu.includes(id))).toEqual(doMenu);
    },
  );

  it("as telas sem item no menu entram logo depois da tela onde moram", () => {
    const comercial = idsEmOrdem(montarTour(["comercial"]));
    expect(comercial.indexOf("transferencias")).toBe(
      comercial.indexOf("conversas") + 1,
    );
    const passo = montarTour(["comercial"]).find(
      (p) => p.rota === "transferencias",
    );
    expect(passo?.alvoDoMenu).toBe("/conversas");
  });

  it("a aba Mais do celular entra para quem tem a aba", () => {
    for (const papel of PAPEIS) {
      const temMais = abasDe([papel]).some((a) => a.id === "mais");
      expect(idsEmOrdem(montarTour([papel])).includes("mais")).toBe(temMais);
    }
  });

  it("o destaque do menu é o caminho da própria tela, ou da tela onde ela mora", () => {
    for (const papel of PAPEIS) {
      for (const passo of montarTour([papel])) {
        if (passo.tipo !== "tela" || !passo.rota) continue;
        expect(Object.values(ROTAS).map((r) => r.caminho)).toContain(
          passo.alvoDoMenu,
        );
        expect(passo.caminho).toBe(ROTAS[passo.rota].caminho);
      }
    }
  });
});

describe("tour do admin", () => {
  it("quem tem diretoria passa por todas as telas do painel", () => {
    const rotas = new Set(idsEmOrdem(montarTour(["diretoria"])));
    expect(rotas).toEqual(new Set(ROTAS_DO_PAINEL));
  });

  it("quem tem todos os papéis passa por todas as telas do painel e termina pelo portal da enfermeira", () => {
    const passos = montarTour(PAPEIS);
    const rotas = idsEmOrdem(passos);
    expect(new Set(rotas)).toEqual(
      new Set([...ROTAS_DO_PAINEL, ...ROTAS_DO_PORTAL]),
    );
    expect(new Set(rotas).size).toBe(rotas.length);

    // Do primeiro passo do portal em diante, só telas do portal (com as
    // chamadas delas e o checklist) e, no fim, o encerramento.
    const primeiroDoPortal = passos.findIndex(
      (p) => p.grupo === "Portal da enfermeira",
    );
    expect(primeiroDoPortal).toBeGreaterThan(0);
    const doPortal = passos.slice(primeiroDoPortal, -1);
    expect(passos.at(-1)!.tipo).toBe("encerramento");
    for (const p of doPortal) {
      if (p.rota) expect(ROTAS[p.rota].casca, p.id).toBe("enfermeira");
      else expect(p.id).toBe("checklist-visita");
    }
    // Antes do portal, só telas do painel.
    for (const p of passos.slice(1, primeiroDoPortal)) {
      expect(ROTAS[p.rota!].casca, p.id).toBe("app");
    }
    expect(doPortal.some((p) => p.id === "checklist-visita")).toBe(true);
  });

  it("o título da abertura diz para quem é o tour", () => {
    expect(montarTour(["diretoria"])[0]!.titulo).toBe(
      "Tour completo, para quem administra",
    );
    expect(montarTour(["comercial"])[0]!.titulo).toBe("Tour do Comercial");
    expect(montarTour(["coordenacao"])[0]!.titulo).toBe("Tour da Coordenação");
    expect(tituloDoTour(["comercial", "financeiro"])).toBe(
      "Tour do Comercial e do Financeiro",
    );
  });
});

describe("portal da enfermeira", () => {
  const passos = montarTour(["enfermeira"]);

  it("começa pelo Hoje e explica o checklist da visita logo depois", () => {
    expect(passos[1]!.rota).toBe("hoje");
    const checklist = passos.find((p) => p.id === "checklist-visita");
    expect(checklist).toBeDefined();
    expect(checklist!.caminho).toBe("/hoje");
    expect(checklist!.ordenado).toBe(true);
    const texto = [checklist!.serve, ...checklist!.fazer].join(" ");
    for (const trecho of [
      "Hoje",
      "Cheguei",
      "Preencher registro",
      "assine",
      "Saí da casa",
      "sem sinal",
    ]) {
      expect(texto).toContain(trecho);
    }
    expect(checklist!.ondeFica).toMatch(/resumo/);
    expect(checklist!.ondeFica).toMatch(/todos os dias/);
  });

  it("menciona o checklist da visita e onde ele fica", () => {
    const tudo = passos
      .map((p) => [p.titulo, p.serve, ...p.fazer, p.ondeFica ?? ""].join(" "))
      .join(" ");
    expect(tudo).toMatch(/checklist/i);
  });

  it("o encerramento diz que o tour fica no Perfil", () => {
    expect(passos.at(-1)!.ondeFica).toMatch(/Perfil/);
  });

  it("ofertas, treinamentos e manuais moram no Perfil", () => {
    for (const id of ["ofertas", "treinamentos", "manuais"] as const) {
      expect(passos.find((p) => p.rota === id)?.alvoDoMenu).toBe("/perfil");
    }
  });
});

describe("abertura e tempo", () => {
  it("a abertura diz quantas telas e cerca de quantos minutos", () => {
    for (const papel of PAPEIS) {
      const passos = montarTour([papel]);
      const telas = passos.filter((p) => p.tipo === "tela").length;
      const minutos = minutosDoTour(passos.slice(1, -1));
      expect(passos[0]!.meta).toContain(`${telas} telas`);
      expect(passos[0]!.meta).toContain(`cerca de ${minutos} minuto`);
      expect(passos[0]!.serve).toContain(`${minutos} minuto`);
    }
  });

  it("ids únicos em todo tour", () => {
    for (const papeis of [...PAPEIS.map((p) => [p]), [...PAPEIS]]) {
      const ids = montarTour(papeis).map((p) => p.id);
      expect(new Set(ids).size).toBe(ids.length);
    }
  });
});

describe("mini-tour das telas principais", () => {
  it.each(PAPEIS.map((p) => [p]))(
    "%s: cada tela principal ganha de 2 a 4 chamadas, logo depois do passo da tela",
    (papel: Papel) => {
      const passos = montarTour([papel]);
      for (const caminho of TELAS_EM_DETALHE[papel]) {
        const i = passos.findIndex(
          (p) => p.tipo === "tela" && p.rota && p.caminho === caminho,
        );
        expect(i, caminho).toBeGreaterThan(0);
        let n = 0;
        while (passos[i + 1 + n]?.tipo === "detalhe") n++;
        expect(n, caminho).toBeGreaterThanOrEqual(2);
        expect(n, caminho).toBeLessThanOrEqual(4);
        for (const detalhe of passos.slice(i + 1, i + 1 + n)) {
          expect(detalhe.caminho).toBe(caminho);
          expect(detalhe.alvoNaTela).toMatch(
            new RegExp(`^${caminho}:[a-z-]+$`),
          );
          expect(detalhe.grupo).toBe(passos[i]!.titulo);
        }
      }
    },
  );

  it.each(PAPEIS.map((p) => [p]))(
    "%s: as outras telas não têm chamadas",
    (papel: Papel) => {
      const principais = new Set<string>(TELAS_EM_DETALHE[papel]);
      for (const passo of montarTour([papel])) {
        if (passo.tipo === "detalhe")
          expect(principais.has(passo.caminho!), passo.id).toBe(true);
      }
    },
  );

  it("o admin tem o mini-tour das 8 telas principais", () => {
    const comChamada = new Set(
      montarTour(["diretoria"])
        .filter((p) => p.tipo === "detalhe")
        .map((p) => p.caminho),
    );
    expect(comChamada.size).toBe(8);
  });

  it("o passo do checklist destaca os botões do cartão da visita", () => {
    const checklist = montarTour(["enfermeira"]).find(
      (p) => p.id === "checklist-visita",
    );
    expect(checklist?.alvoNaTela).toBe("/hoje:botoes");
  });
});
