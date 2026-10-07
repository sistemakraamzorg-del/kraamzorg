import { VERSAO_TOUR } from "./passos";

/**
 * O que o tour guarda no navegador, como uma loja externa para o React
 * (`useSyncExternalStore`). Tudo é conforto de tela, nunca regra: sem
 * armazenamento (janela anônima, site bloqueado), a cópia em memória segura
 * o tour enquanto a página estiver aberta, e só o convite pode voltar numa
 * próxima entrada.
 *
 * - sessionStorage `kz-tour:andamento`: o passo atual e a tela, para o tour
 *   sobreviver à troca entre o painel e o portal da enfermeira (cada casca
 *   tem o próprio provedor) e ao recarregar a página.
 * - localStorage `kz-tour:<usuarioId>:<versao>`: o convite da primeira
 *   entrada já foi respondido ("iniciado", "dispensado" ou "concluido").
 *
 * Toda leitura e escrita do armazenamento passa por try/catch. Nenhum nome
 * de pessoa ou de família vai para o armazenamento.
 */

export const CHAVE_ANDAMENTO = "kz-tour:andamento";

export type DesfechoConvite = "iniciado" | "dispensado" | "concluido";

export interface Andamento {
  usuarioId: string;
  versao: string;
  /** Total de passos do tour salvo: se mudou, o andamento não vale mais. */
  total: number;
  indice: number;
  /** Tela em que o passo estava, para conferência. */
  caminho: string | null;
}

type Area = "sessao" | "local";

const ouvintes = new Set<() => void>();
/** Cópia em memória do que foi lido ou gravado (vale sem armazenamento). */
const memoria = new Map<string, string | null>();

function armazenamento(area: Area): Storage | null {
  try {
    if (typeof window === "undefined") return null;
    return area === "sessao" ? window.sessionStorage : window.localStorage;
  } catch {
    return null;
  }
}

function ler(area: Area, chave: string): string | null {
  const k = `${area}:${chave}`;
  if (memoria.has(k)) return memoria.get(k) ?? null;
  let valor: string | null = null;
  try {
    valor = armazenamento(area)?.getItem(chave) ?? null;
  } catch {
    valor = null;
  }
  memoria.set(k, valor);
  return valor;
}

function gravar(area: Area, chave: string, valor: string | null): void {
  memoria.set(`${area}:${chave}`, valor);
  try {
    const loja = armazenamento(area);
    if (valor === null) loja?.removeItem(chave);
    else loja?.setItem(chave, valor);
  } catch {
    // Sem armazenamento: fica só a cópia em memória.
  }
  for (const ouvinte of ouvintes) ouvinte();
}

/** Assina as mudanças (para `useSyncExternalStore`). */
export function assinarTour(ouvinte: () => void): () => void {
  ouvintes.add(ouvinte);
  return () => {
    ouvintes.delete(ouvinte);
  };
}

/** Esquece a cópia em memória (testes). */
export function esquecerMemoriaDoTour(): void {
  memoria.clear();
}

export function chaveConvite(usuarioId: string): string {
  return `kz-tour:${usuarioId}:${VERSAO_TOUR}`;
}

/** O andamento cru, como está guardado (estável enquanto não muda). */
export function andamentoBruto(): string | null {
  return ler("sessao", CHAVE_ANDAMENTO);
}

export function interpretarAndamento(
  bruto: string | null,
  usuarioId: string,
  total: number,
): Andamento | null {
  if (!bruto) return null;
  try {
    const dados = JSON.parse(bruto) as Partial<Andamento>;
    if (
      dados.usuarioId !== usuarioId ||
      dados.versao !== VERSAO_TOUR ||
      dados.total !== total ||
      typeof dados.indice !== "number" ||
      dados.indice < 0 ||
      dados.indice >= total
    ) {
      return null;
    }
    return {
      usuarioId,
      versao: VERSAO_TOUR,
      total,
      indice: dados.indice,
      caminho: typeof dados.caminho === "string" ? dados.caminho : null,
    };
  } catch {
    return null;
  }
}

export function gravarAndamento(andamento: Omit<Andamento, "versao">): void {
  gravar(
    "sessao",
    CHAVE_ANDAMENTO,
    JSON.stringify({ ...andamento, versao: VERSAO_TOUR }),
  );
}

export function apagarAndamento(): void {
  gravar("sessao", CHAVE_ANDAMENTO, null);
}

export function lerConvite(usuarioId: string): DesfechoConvite | null {
  const valor = ler("local", chaveConvite(usuarioId));
  return valor === "iniciado" || valor === "dispensado" || valor === "concluido"
    ? valor
    : null;
}

export function gravarConvite(
  usuarioId: string,
  desfecho: DesfechoConvite,
): void {
  gravar("local", chaveConvite(usuarioId), desfecho);
}
