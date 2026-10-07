import type { Papel } from "@/lib/auth/papeis";
import {
  abasDe,
  gruposDe,
  NAVEGACAO,
  papelPrincipal,
  ROTAS,
  rotasPermitidas,
  type IdRota,
} from "@/lib/navegacao";
import {
  GRUPOS_TOUR,
  PASSO_CHECKLIST,
  PASSOS,
  TELAS_EM_DETALHE,
  textoAbertura,
  textoEncerramento,
  type CaminhoRota,
  type Detalhe,
  type Verbete,
} from "./passos";

/**
 * Monta o tour de quem tem estes papéis (função pura, testada em
 * montar.test.ts). As telas saem do registro de navegação: o tour de uma
 * pessoa passa por toda tela que ela pode abrir (`rotasPermitidas`), na
 * ordem da barra lateral (Comercial, Operação, Experiência, Gestão,
 * Sistema). As telas que não têm item próprio no menu entram logo depois da
 * tela onde moram (Transferências dentro de Conversas; Ofertas,
 * Treinamentos e Manuais da enfermeira dentro do Perfil). Quem também é
 * enfermeira termina pelo portal dela.
 */

export type TipoPasso = "abertura" | "tela" | "detalhe" | "encerramento";

export interface Passo {
  /** Único no tour: "abertura", "tela:pipeline", "detalhe:pipeline:busca"... */
  id: string;
  tipo: TipoPasso;
  /** Rota do registro que o passo apresenta (null na abertura, no encerramento e no checklist). */
  rota: IdRota | null;
  /** Tela para onde o tour navega; null fica na tela atual. */
  caminho: string | null;
  titulo: string;
  serve: string;
  fazer: string[];
  ondeFica?: string;
  dica?: string;
  /** Rótulo do grupo do menu (ou do portal) em que a tela mora. */
  grupo: string;
  /** `data-tour` do item do menu que o passo destaca (o caminho da rota). */
  alvoDoMenu: string | null;
  /** `data-tour` do elemento da página, nas chamadas do mini-tour. */
  alvoNaTela?: string;
  /** Linha extra do alto do cartão (abertura: "12 telas · cerca de 8 minutos"). */
  meta?: string;
  /** "O que fazer" numerado, porque a ordem importa (checklist da visita). */
  ordenado?: boolean;
}

/** Segundos estimados por tipo de passo, para o "cerca de N minutos". */
const SEGUNDOS: Record<TipoPasso, number> = {
  abertura: 10,
  tela: 25,
  detalhe: 12,
  encerramento: 10,
};

/**
 * Tela sem item próprio no menu: entra no tour logo depois da tela onde
 * mora, e o destaque vai para o item dessa tela.
 */
const MORA_EM: Partial<Record<IdRota, IdRota>> = {
  transferencias: "conversas",
  minhasEvolucoes: "hoje",
  ofertas: "perfil",
  treinamentos: "perfil",
  manuais: "perfil",
};

/** O que cada papel pode abrir, do registro de navegação. */
function rotasDoPapel(papel: Papel): Set<IdRota> {
  return rotasPermitidas([papel]);
}

/** Precedência dos papéis (principal primeiro), para escolher o texto por papel. */
function ordenarPorPrecedencia(papeis: readonly Papel[]): Papel[] {
  const restantes = [...papeis];
  const ordenados: Papel[] = [];
  while (restantes.length > 0) {
    const principal = papelPrincipal(restantes);
    if (!principal) break;
    ordenados.push(principal);
    restantes.splice(restantes.indexOf(principal), 1);
  }
  return ordenados;
}

interface TextoEscolhido {
  titulo: string;
  serve: string;
  fazer: string[];
  ondeFica: string;
  dica?: string;
  detalhes: Detalhe[];
}

/**
 * Junta o verbete com o texto do papel: vale o primeiro papel, na ordem de
 * precedência, que abre esta tela e tem texto próprio para ela.
 */
function textoDaTela(
  id: IdRota,
  papeis: readonly Papel[],
  preferir?: Papel,
): TextoEscolhido {
  const verbete: Verbete = PASSOS[ROTAS[id].caminho];
  const candidatos = preferir
    ? [preferir, ...ordenarPorPrecedencia(papeis)]
    : ordenarPorPrecedencia(papeis);
  const papel = candidatos.find(
    (p) => rotasDoPapel(p).has(id) && verbete.porPapel?.[p],
  );
  const proprio = papel ? verbete.porPapel?.[papel] : undefined;
  return {
    titulo: verbete.titulo,
    serve: proprio?.serve ?? verbete.serve,
    fazer: proprio?.fazer ?? verbete.fazer,
    ondeFica: proprio?.ondeFica ?? verbete.ondeFica,
    dica: proprio?.dica ?? verbete.dica,
    detalhes: proprio?.detalhes ?? verbete.detalhes ?? [],
  };
}

/** Telas com mini-tour para estes papéis (TELAS_EM_DETALHE). */
function telasEmDetalhe(papeis: readonly Papel[]): Set<string> {
  const base: readonly Papel[] = papeis.includes("diretoria")
    ? papeis.filter((p) => p === "diretoria" || p === "enfermeira")
    : papeis;
  return new Set(base.flatMap((papel) => TELAS_EM_DETALHE[papel]));
}

interface Item {
  id: IdRota;
  grupo: string;
  /** Rota cujo item do menu o passo destaca. */
  alvo: IdRota;
  portal: boolean;
}

/** Telas do painel (casca app), na ordem do menu, com as que moram dentro de outra. */
function itensDoPainel(papeis: readonly Papel[]): Item[] {
  const doPainel = papeis.filter((p) => p !== "enfermeira");
  if (doPainel.length === 0) return [];
  const permitidas = new Set(
    [...rotasPermitidas(doPainel)].filter((id) => ROTAS[id].casca === "app"),
  );
  const itens: Item[] = [];
  const vistos = new Set<IdRota>();
  const incluir = (id: IdRota, grupo: string, alvo: IdRota) => {
    if (vistos.has(id) || !permitidas.has(id)) return;
    vistos.add(id);
    itens.push({ id, grupo, alvo, portal: false });
    // As que moram dentro desta entram logo depois dela.
    for (const [oculta, casa] of Object.entries(MORA_EM) as [
      IdRota,
      IdRota,
    ][]) {
      if (casa === id) incluir(oculta, grupo, id);
    }
  };

  for (const grupo of gruposDe(doPainel)) {
    for (const item of grupo.itens) incluir(item.id, grupo.titulo, item.id);
  }
  // Abas do celular sem item na barra lateral (a aba Mais).
  for (const aba of abasDe(doPainel)) {
    incluir(aba.id, GRUPOS_TOUR.celular, aba.id);
  }
  // Qualquer outra tela permitida que ainda não entrou (rota nova sem casa).
  for (const id of permitidas) {
    const casa = MORA_EM[id];
    incluir(id, GRUPOS_TOUR.celular, casa && vistos.has(casa) ? casa : id);
  }
  return itens;
}

/** Telas do portal da enfermeira, na ordem das abas, com as que moram dentro de outra. */
function itensDoPortal(
  papeis: readonly Papel[],
  jaNoTour: Set<IdRota>,
): Item[] {
  if (!papeis.includes("enfermeira")) return [];
  const permitidas = rotasPermitidas(["enfermeira"]);
  const itens: Item[] = [];
  const vistos = new Set<IdRota>(jaNoTour);
  const incluir = (id: IdRota, alvo: IdRota) => {
    if (vistos.has(id) || !permitidas.has(id)) return;
    vistos.add(id);
    itens.push({ id, grupo: GRUPOS_TOUR.portal, alvo, portal: true });
    for (const [oculta, casa] of Object.entries(MORA_EM) as [
      IdRota,
      IdRota,
    ][]) {
      if (casa === id) incluir(oculta, id);
    }
  };
  for (const aba of NAVEGACAO.enfermeira.abas) incluir(aba, aba);
  for (const id of permitidas) {
    const casa = MORA_EM[id];
    incluir(id, casa && vistos.has(casa) ? casa : id);
  }
  return itens;
}

function passoDaTela(item: Item, papeis: readonly Papel[]): Passo[] {
  const rota = ROTAS[item.id];
  const texto = textoDaTela(
    item.id,
    papeis,
    item.portal ? "enfermeira" : undefined,
  );
  const passos: Passo[] = [
    {
      id: `tela:${item.id}`,
      tipo: "tela",
      rota: item.id,
      caminho: rota.caminho,
      titulo: texto.titulo,
      serve: texto.serve,
      fazer: texto.fazer,
      ondeFica: texto.ondeFica,
      dica: texto.dica,
      grupo: item.grupo,
      alvoDoMenu: ROTAS[item.alvo].caminho,
    },
  ];
  if (telasEmDetalhe(papeis).has(rota.caminho as CaminhoRota)) {
    for (const detalhe of texto.detalhes) {
      passos.push({
        id: `detalhe:${item.id}:${detalhe.nome}`,
        tipo: "detalhe",
        rota: item.id,
        caminho: rota.caminho,
        titulo: detalhe.titulo,
        serve: detalhe.texto,
        fazer: [],
        grupo: texto.titulo,
        alvoDoMenu: ROTAS[item.alvo].caminho,
        alvoNaTela: `${rota.caminho}:${detalhe.nome}`,
      });
    }
  }
  if (item.id === "hoje") passos.push(passoDoChecklist(item.grupo));
  return passos;
}

function passoDoChecklist(grupo: string): Passo {
  return {
    id: "checklist-visita",
    tipo: "tela",
    rota: null,
    caminho: ROTAS.hoje.caminho,
    titulo: PASSO_CHECKLIST.titulo,
    serve: PASSO_CHECKLIST.serve,
    fazer: PASSO_CHECKLIST.fazer,
    ondeFica: PASSO_CHECKLIST.ondeFica,
    dica: PASSO_CHECKLIST.dica,
    grupo,
    alvoDoMenu: ROTAS.hoje.caminho,
    ordenado: true,
  };
}

/** Minutos estimados para estes passos (abertura e encerramento incluídos). */
export function minutosDoTour(passos: readonly Pick<Passo, "tipo">[]): number {
  const segundos =
    passos.reduce((soma, passo) => soma + SEGUNDOS[passo.tipo], 0) +
    SEGUNDOS.abertura +
    SEGUNDOS.encerramento;
  return Math.max(1, Math.round(segundos / 60));
}

export function montarTour(papeis: readonly Papel[]): Passo[] {
  const painel = itensDoPainel(papeis);
  const portal = itensDoPortal(papeis, new Set(painel.map((i) => i.id)));
  const meio = [...painel, ...portal].flatMap((item) =>
    passoDaTela(item, papeis),
  );
  const telas = meio.filter((p) => p.tipo === "tela").length;
  const minutos = minutosDoTour(meio);
  const soPortal = painel.length === 0 && portal.length > 0;

  const abertura = textoAbertura({ papeis, telas, minutos });
  const encerramento = textoEncerramento({ telas, soPortal });

  return [
    {
      id: "abertura",
      tipo: "abertura",
      rota: null,
      caminho: null,
      titulo: abertura.titulo,
      serve: abertura.serve,
      fazer: abertura.fazer,
      ondeFica: abertura.ondeFica,
      dica: abertura.dica,
      grupo: GRUPOS_TOUR.abertura,
      alvoDoMenu: null,
      meta: abertura.meta,
    },
    ...meio,
    {
      id: "encerramento",
      tipo: "encerramento",
      rota: null,
      caminho: null,
      titulo: encerramento.titulo,
      serve: encerramento.serve,
      fazer: encerramento.fazer,
      ondeFica: encerramento.ondeFica,
      dica: encerramento.dica,
      grupo: GRUPOS_TOUR.encerramento,
      alvoDoMenu: null,
    },
  ];
}

/** Rotas que o tour apresenta (para os testes e para conferir o registro). */
export function rotasDoTour(passos: readonly Passo[]): IdRota[] {
  return passos
    .filter((p) => p.tipo === "tela" && p.rota)
    .map((p) => p.rota as IdRota);
}
