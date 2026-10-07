"use client";

import {
  createContext,
  Suspense,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useSyncExternalStore,
  useTransition,
  type ReactNode,
} from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { Papel } from "@/lib/auth/papeis";
import { caminhoInicial } from "@/lib/navegacao";
import { CartaoTour } from "./cartao-tour";
import { ConviteTour } from "./convite-tour";
import {
  andamentoBruto,
  apagarAndamento,
  assinarTour,
  gravarAndamento,
  gravarConvite,
  interpretarAndamento,
  lerConvite,
  type DesfechoConvite,
} from "./estado";
import { minutosDoTour, montarTour, type Passo } from "./montar";
import { TEXTOS_TOUR } from "./passos";

/**
 * Provedor do tour guiado. Mora nas duas cascas (painel e portal da
 * enfermeira), porque o tour de quem tem os dois passa de uma para a outra:
 * cada casca monta o próprio provedor, e o passo atual vai pelo
 * sessionStorage (src/modules/tour/estado.ts) para o novo retomar.
 *
 * Começa de três jeitos, nunca sozinho: o botão "Fazer o tour" (barra
 * lateral, aba Mais, Perfil da enfermeira), o parâmetro `?tour=1` em
 * qualquer tela e o convite discreto da primeira entrada, que aparece só na
 * tela inicial da pessoa e some de vez depois de respondido.
 */

interface ValorTour {
  ativo: boolean;
  iniciar: (origem?: HTMLElement | null) => void;
  passos: readonly Passo[];
}

const ContextoTour = createContext<ValorTour | null>(null);

/** O tour da casca atual, ou null fora de uma casca (vitrine, testes de tela). */
export function useTour(): ValorTour | null {
  return useContext(ContextoTour);
}

/** A tela atual é a tela do passo (ou uma tela dentro dela, como a ficha de uma família). */
export function estaNaTela(caminhoAtual: string, caminho: string): boolean {
  return caminhoAtual === caminho || caminhoAtual.startsWith(`${caminho}/`);
}

/** No servidor e na hidratação, nada do tour aparece: o armazenamento é do navegador. */
const NO_SERVIDOR = "servidor";

const semAssinatura = () => () => {};

/**
 * Navegador conduzido por robô (testes de ponta a ponta): o convite da
 * primeira entrada não aparece, para não cobrir a tela que o teste usa. O
 * tour em si continua funcionando, e o teste do convite simula uma pessoa.
 */
function navegadorAutomatizado(): boolean {
  try {
    return window.navigator.webdriver === true;
  } catch {
    return false;
  }
}

/** Lê `?tour=1` (precisa de Suspense, por causa do useSearchParams). */
function GatilhoParametro({ aoPedir }: { aoPedir: () => void }) {
  const parametros = useSearchParams();
  const pedido = parametros.get("tour") === "1";
  useEffect(() => {
    if (!pedido) return;
    aoPedir();
    // Tira o parâmetro da barra de endereço sem recarregar a tela.
    try {
      const url = new URL(window.location.href);
      url.searchParams.delete("tour");
      window.history.replaceState(window.history.state, "", url.toString());
    } catch {
      // Sem history: o parâmetro fica, e o tour já começou.
    }
  }, [pedido, aoPedir]);
  return null;
}

export function ProvedorTour({
  papeis,
  usuarioId,
  children,
}: {
  papeis: Papel[];
  usuarioId: string;
  children: ReactNode;
}) {
  const router = useRouter();
  const caminhoAtual = usePathname() ?? "";
  const passos = useMemo(() => montarTour(papeis), [papeis]);
  const minutos = useMemo(() => minutosDoTour(passos.slice(1, -1)), [passos]);
  const origemRef = useRef<HTMLElement | null>(null);
  // Enquanto a tela do passo carrega, Próximo e Voltar esperam: duas
  // navegações seguidas (uma delas com redirecionamento, como a das
  // transferências) podiam terminar na tela errada.
  const [navegando, iniciarNavegacao] = useTransition();

  // O passo atual e o convite vêm do armazenamento do navegador (loja
  // externa): assim o provedor da outra casca retoma de onde parou.
  const bruto = useSyncExternalStore(
    assinarTour,
    andamentoBruto,
    () => NO_SERVIDOR,
  );
  const convite = useSyncExternalStore(
    assinarTour,
    () => lerConvite(usuarioId) ?? "sem-resposta",
    () => NO_SERVIDOR,
  );
  const automatizado = useSyncExternalStore(
    semAssinatura,
    navegadorAutomatizado,
    () => true,
  );
  const indice =
    bruto === NO_SERVIDOR
      ? null
      : (interpretarAndamento(bruto, usuarioId, passos.length)?.indice ?? null);

  const irPara = useCallback(
    (novo: number) => {
      const passo = passos[novo];
      if (!passo) return;
      gravarAndamento({
        usuarioId,
        total: passos.length,
        indice: novo,
        caminho: passo.caminho,
      });
      const destino = passo.caminho;
      if (destino && !estaNaTela(caminhoAtual, destino)) {
        iniciarNavegacao(() => router.push(destino));
      }
    },
    [passos, caminhoAtual, router, usuarioId],
  );

  const iniciar = useCallback(
    (origem?: HTMLElement | null) => {
      origemRef.current =
        origem ??
        (typeof document !== "undefined" &&
        document.activeElement instanceof HTMLElement
          ? document.activeElement
          : null);
      gravarConvite(usuarioId, "iniciado");
      irPara(0);
    },
    [irPara, usuarioId],
  );

  const fechar = useCallback(
    (desfecho: Exclude<DesfechoConvite, "iniciado">) => {
      apagarAndamento();
      gravarConvite(usuarioId, desfecho);
      const origem = origemRef.current;
      origemRef.current = null;
      // O foco volta para quem abriu o tour; se a tela mudou, para o conteúdo.
      window.setTimeout(() => {
        if (origem && origem.isConnected) origem.focus();
        else document.getElementById("conteudo")?.focus();
      }, 0);
    },
    [usuarioId],
  );

  const valor = useMemo<ValorTour>(
    () => ({ ativo: indice !== null, iniciar, passos }),
    [indice, iniciar, passos],
  );

  const passoAtual = indice === null ? null : (passos[indice] ?? null);
  const mostrarConvite =
    indice === null &&
    convite === "sem-resposta" &&
    !automatizado &&
    caminhoAtual === caminhoInicial(papeis);

  return (
    <ContextoTour.Provider value={valor}>
      {children}
      <Suspense fallback={null}>
        <GatilhoParametro aoPedir={iniciar} />
      </Suspense>
      <p className="sr-only" aria-live="polite" aria-atomic="true">
        {passoAtual && indice !== null
          ? `${TEXTOS_TOUR.passoDe(indice + 1, passos.length)}: ${passoAtual.titulo}`
          : ""}
      </p>
      {passoAtual && indice !== null ? (
        <CartaoTour
          passo={passoAtual}
          indice={indice}
          total={passos.length}
          caminhoAtual={caminhoAtual}
          navegando={navegando}
          aoVoltar={() => irPara(Math.max(0, indice - 1))}
          aoAvancar={() =>
            indice + 1 < passos.length
              ? irPara(indice + 1)
              : fechar("concluido")
          }
          aoPular={() => fechar("dispensado")}
          aoConcluir={() => fechar("concluido")}
          aoRever={() => irPara(0)}
        />
      ) : null}
      {mostrarConvite ? (
        <ConviteTour
          minutos={minutos}
          aoComecar={(origem) => iniciar(origem)}
          aoDispensar={() => gravarConvite(usuarioId, "dispensado")}
        />
      ) : null}
    </ContextoTour.Provider>
  );
}
