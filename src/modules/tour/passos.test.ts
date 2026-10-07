import { describe, expect, it } from "vitest";
import { PAPEIS } from "@/lib/auth/papeis";
import { ROTAS } from "@/lib/navegacao";
import { montarTour } from "./montar";
import {
  PASSO_CHECKLIST,
  PASSOS,
  TELAS_EM_DETALHE,
  TEXTOS_TOUR,
  textoAbertura,
  textoEncerramento,
  type Detalhe,
  type TextoPorPapel,
  type Verbete,
} from "./passos";

/** Todo texto de um verbete, com o lugar de onde veio (para a mensagem de erro). */
function textosDoVerbete(
  onde: string,
  v: Verbete | TextoPorPapel,
): [string, string][] {
  const textos: [string, string][] = [];
  if ("titulo" in v) textos.push([`${onde}.titulo`, v.titulo]);
  if (v.serve !== undefined) textos.push([`${onde}.serve`, v.serve]);
  v.fazer?.forEach((f, i) => textos.push([`${onde}.fazer[${i}]`, f]));
  if (v.ondeFica !== undefined) textos.push([`${onde}.ondeFica`, v.ondeFica]);
  if (v.dica !== undefined) textos.push([`${onde}.dica`, v.dica]);
  v.detalhes?.forEach((d: Detalhe) => {
    textos.push([`${onde}.detalhes.${d.nome}.titulo`, d.titulo]);
    textos.push([`${onde}.detalhes.${d.nome}.texto`, d.texto]);
  });
  if ("porPapel" in v && v.porPapel) {
    for (const [papel, texto] of Object.entries(v.porPapel)) {
      textos.push(...textosDoVerbete(`${onde}.porPapel.${papel}`, texto));
    }
  }
  return textos;
}

function todosOsTextos(): [string, string][] {
  const textos: [string, string][] = [];
  for (const [caminho, verbete] of Object.entries(PASSOS)) {
    textos.push(...textosDoVerbete(caminho, verbete));
  }
  textos.push(...textosDoVerbete("checklist", PASSO_CHECKLIST));
  for (const papeis of [...PAPEIS.map((p) => [p]), [...PAPEIS]]) {
    textos.push(
      ...textosDoVerbete(
        `abertura(${papeis})`,
        textoAbertura({ papeis, telas: 12, minutos: 8 }),
      ),
    );
  }
  for (const soPortal of [true, false]) {
    textos.push(
      ...textosDoVerbete(
        `encerramento(${soPortal})`,
        textoEncerramento({ telas: 12, soPortal }),
      ),
    );
  }
  const visitar = (onde: string, valor: unknown) => {
    if (typeof valor === "string") textos.push([onde, valor]);
    else if (typeof valor === "function")
      textos.push([
        onde,
        String((valor as (a: number, b: number) => string)(3, 9)),
      ]);
    else if (valor && typeof valor === "object")
      for (const [k, v] of Object.entries(valor)) visitar(`${onde}.${k}`, v);
  };
  visitar("TEXTOS_TOUR", TEXTOS_TOUR);
  return textos;
}

const palavras = (texto: string) => texto.split(/\s+/).filter(Boolean).length;

describe("catálogo do tour", () => {
  it("toda rota do registro de navegação tem verbete, e o catálogo não tem rota que não existe", () => {
    const caminhos = Object.values(ROTAS).map((r) => r.caminho);
    expect(Object.keys(PASSOS).sort()).toEqual([...caminhos].sort());
  });

  it("as telas com mini-tour existem no registro", () => {
    const caminhos = new Set<string>(
      Object.values(ROTAS).map((r) => r.caminho),
    );
    for (const lista of Object.values(TELAS_EM_DETALHE)) {
      for (const caminho of lista) expect(caminhos.has(caminho)).toBe(true);
    }
  });

  it("nenhum texto vazio, com travessão, meia-risca ou tratamento proibido", () => {
    for (const [onde, texto] of todosOsTextos()) {
      expect(texto.trim(), onde).not.toBe("");
      expect(texto, onde).not.toMatch(/[—–]/);
      expect(texto, onde).not.toMatch(/m[ãa]ezinha|mam[ãa]e|papai/i);
      expect(texto, onde).not.toMatch(/Família Teste|Perfil Teste|Teste /);
    }
  });

  it("nenhum termo técnico, sigla sem explicação ou palavra com sublinhado", () => {
    const proibidos =
      /\b(RLS|AAL\d?|MFA|RPC|logs?|tokens?|slugs?|ids?|payloads?|enums?|sync|sincroniza[çc][ãa]o de dados|status|deploy|dashboard|kanban|backend|frontend|webhooks?|API|JSON|SQL|app|login|logout|upload|download|offline|bug|cache|schema|query|endpoint|template|n8n|supabase|PostgREST|Vercel)\b/i;
    for (const [onde, texto] of todosOsTextos()) {
      expect(texto, onde).not.toMatch(proibidos);
      expect(texto, onde).not.toMatch(/_/);
      expect(texto, onde).not.toMatch(/\.(tsx?|sql|json|md)\b/);
    }
  });

  it("serve curto, fazer curto e cada passo cabe em cerca de 60 palavras", () => {
    const verbetes: [string, Verbete | TextoPorPapel][] = [
      ...Object.entries(PASSOS),
      ["checklist", PASSO_CHECKLIST],
    ];
    for (const [caminho, verbete] of Object.entries(PASSOS)) {
      for (const [papel, texto] of Object.entries(verbete.porPapel ?? {})) {
        verbetes.push([`${caminho}.${papel}`, { ...verbete, ...texto }]);
      }
    }
    for (const [onde, v] of verbetes) {
      const serve = v.serve ?? "";
      const fazer = v.fazer ?? [];
      expect(serve.length, `${onde}.serve`).toBeLessThanOrEqual(180);
      for (const item of fazer) {
        expect(item.length, `${onde}.fazer`).toBeLessThanOrEqual(110);
      }
      expect(fazer.length, `${onde}.fazer`).toBeGreaterThanOrEqual(2);
      expect(fazer.length, `${onde}.fazer`).toBeLessThanOrEqual(
        onde === "checklist" ? 4 : 3,
      );
      expect(palavras([serve, ...fazer].join(" ")), onde).toBeLessThanOrEqual(
        60,
      );
      for (const d of v.detalhes ?? []) {
        expect(d.texto.length, `${onde}.${d.nome}`).toBeLessThanOrEqual(180);
      }
    }
  });

  it("termo do ofício no título vem explicado no começo de serve", () => {
    const termos: Record<string, RegExp> = {
      "/pipeline": /^O pipeline é/,
      "/radar": /^O radar/,
      "/prenatal": /^A consulta pré-natal é/,
      "/sessoes-venda": /^A sessão de venda é/,
      "/pos-venda": /O NPS é/,
      "/capacidade": /^A capacidade mostra/,
      "/copiloto": /^O copiloto é/,
      "/evolucoes": /^A evolução é/,
      "/minhas-evolucoes": /^A evolução é/,
      "/ocorrencias": /^A ocorrência é/,
      "/transferencias": /^A transferência é/,
      "/agente": /^A Isadora é/,
      "/ofertas": /^A oferta é/,
    };
    for (const [caminho, padrao] of Object.entries(termos)) {
      expect(PASSOS[caminho as keyof typeof PASSOS].serve, caminho).toMatch(
        padrao,
      );
    }
  });

  it("nenhum passo montado tem texto de família ou de pessoa", () => {
    for (const papeis of [...PAPEIS.map((p) => [p]), [...PAPEIS]]) {
      for (const passo of montarTour(papeis)) {
        const texto = [
          passo.titulo,
          passo.serve,
          ...passo.fazer,
          passo.ondeFica ?? "",
          passo.dica ?? "",
        ].join(" ");
        expect(texto).not.toMatch(/Teste/);
      }
    }
  });

  it("a tela do portal da família explica que a família tem um portal próprio, fora do tour", () => {
    const v = PASSOS["/portal-familia"];
    expect(v.serve).toMatch(/portal próprio/);
    expect(v.dica).toMatch(/não entra neste tour/);
  });
});
