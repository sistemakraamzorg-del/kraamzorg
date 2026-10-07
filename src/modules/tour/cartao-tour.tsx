"use client";

import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type KeyboardEvent,
  type ReactNode,
} from "react";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  ChevronDown,
  Clock,
  Lightbulb,
  MapPin,
  RotateCcw,
} from "lucide-react";
import { Barra } from "@/components/mockup";
import { cn } from "@/lib/utils";
import type { Passo } from "./montar";
import { TEXTOS_TOUR } from "./passos";

/**
 * Cartão do tour guiado: o destaque (spotlight) sobre o lugar da tela no
 * menu, ou sobre um elemento da página no mini-tour, e o cartão ao lado,
 * com o passo, o grupo, o título, para que serve, o que fazer, onde fica e
 * a dica. O cartão é um diálogo não modal: a tela de fundo continua à
 * vista e tocável, e o véu não segura clique.
 *
 * Sem alvo visível (celular sem barra lateral, elemento que não existe na
 * tela), o cartão fica no centro, sem destaque. Tela que no celular mora em
 * "Mais" ganha o destaque na aba Mais e uma linha dizendo isso.
 *
 * Teclado: Esc fecha, setas esquerda e direita voltam e avançam. O foco vai
 * para o cartão a cada passo.
 */

/** Respiro entre o destaque e o elemento, e entre o cartão e a borda da tela. */
const FOLGA_DESTAQUE = 4;
const MARGEM = 16;
const DISTANCIA = 12;
/** Véu do tour: marinho translúcido, para a tela de fundo seguir legível. */
const COR_VEU = "color-mix(in srgb, var(--marinho) 28%, transparent)";
const VEU = `0 0 0 200vmax ${COR_VEU}`;
/** Largura do cartão: no computador (a partir de 1024 px) e no celular (no máximo). */
const LARGURA_COMPUTADOR = 1024;
const LARGURA_CARTAO_COMPUTADOR = 372;
const LARGURA_CARTAO_CELULAR = 400;
/** Menor altura aceitável para o cartão encolhido ao lado do destaque. */
const ALTURA_MINIMA_CARTAO = 240;
/** Até quantas palavras ficam à vista; o resto vai para "Ver mais". */
const PALAVRAS_A_VISTA = 60;

interface Retangulo {
  top: number;
  left: number;
  width: number;
  height: number;
  raio: string;
}

/** Onde o cartão fica: em volta do destaque, ou no centro da tela. */
interface Posicao {
  modo: "centro" | "ancorado";
  top: number;
  left: number;
  /** Sem espaço para o cartão inteiro: ele encolhe e rola por dentro. */
  alturaMaxima?: number;
  apertado?: boolean;
}

interface Medida {
  passoId: string;
  destaque: Retangulo | null;
  posicao: Posicao;
  /** Largura do cartão, medida na tela (não em vw: tela que rola de lado infla o vw). */
  largura: number;
  /** O destaque caiu na aba Mais (tela que no celular mora lá). */
  emMais: boolean;
}

function mesmoRetangulo(a: Retangulo | null, b: Retangulo): boolean {
  return (
    !!a &&
    Math.round(a.top) === Math.round(b.top) &&
    Math.round(a.left) === Math.round(b.left) &&
    Math.round(a.width) === Math.round(b.width) &&
    Math.round(a.height) === Math.round(b.height) &&
    a.raio === b.raio
  );
}

function mesmaPosicao(a: Posicao, b: Posicao): boolean {
  return (
    a.modo === b.modo &&
    Math.round(a.top) === Math.round(b.top) &&
    Math.round(a.left) === Math.round(b.left) &&
    Math.round(a.alturaMaxima ?? -1) === Math.round(b.alturaMaxima ?? -1)
  );
}

function mesmaMedida(a: Medida | null, b: Medida): boolean {
  if (!a || a.passoId !== b.passoId || a.emMais !== b.emMais) return false;
  if (Math.round(a.largura) !== Math.round(b.largura)) return false;
  if (!mesmaPosicao(a.posicao, b.posicao)) return false;
  if (!a.destaque || !b.destaque) return a.destaque === b.destaque;
  return mesmoRetangulo(a.destaque, b.destaque);
}

function contarPalavras(texto: string | undefined): number {
  return texto ? texto.split(/\s+/).filter(Boolean).length : 0;
}

/** Quanto do passo cabe à vista: `serve` e `fazer` sempre; depois onde fica e dica, se couberem. */
export function partesAVista(passo: Passo): {
  ondeFica: boolean;
  dica: boolean;
} {
  let total = contarPalavras([passo.serve, ...passo.fazer].join(" "));
  const ondeFica =
    !!passo.ondeFica &&
    total + contarPalavras(passo.ondeFica) <= PALAVRAS_A_VISTA;
  if (ondeFica) total += contarPalavras(passo.ondeFica);
  const dica =
    ondeFica &&
    !!passo.dica &&
    total + contarPalavras(passo.dica) <= PALAVRAS_A_VISTA;
  return { ondeFica, dica };
}

function elementoVisivel(el: HTMLElement): boolean {
  const r = el.getBoundingClientRect();
  if (r.width <= 0 || r.height <= 0) return false;
  const estilo = window.getComputedStyle(el);
  return estilo.visibility !== "hidden" && estilo.display !== "none";
}

function acharAlvo(valor: string): HTMLElement | null {
  const escapado =
    typeof CSS !== "undefined" && CSS.escape ? CSS.escape(valor) : valor;
  const lista = document.querySelectorAll<HTMLElement>(
    `[data-tour="${escapado}"]`,
  );
  for (const el of lista) if (elementoVisivel(el)) return el;
  return null;
}

/** O alvo do passo: o elemento da página, o item do menu ou, no celular, a aba Mais. */
function alvoDoPasso(passo: Passo): {
  el: HTMLElement | null;
  emMais: boolean;
} {
  if (passo.alvoNaTela)
    return { el: acharAlvo(passo.alvoNaTela), emMais: false };
  if (!passo.alvoDoMenu) return { el: null, emMais: false };
  const proprio = acharAlvo(passo.alvoDoMenu);
  if (proprio) return { el: proprio, emMais: false };
  if (passo.tipo === "tela") {
    const mais = acharAlvo("/mais");
    if (mais) return { el: mais, emMais: true };
  }
  return { el: null, emMais: false };
}

/** Onde começa a navegação fixa no pé da tela (celular), ou o fim da tela. */
function limiteDeBaixo(): number {
  let limite = window.innerHeight;
  for (const nav of document.querySelectorAll<HTMLElement>("nav")) {
    if (window.getComputedStyle(nav).position !== "fixed") continue;
    const r = nav.getBoundingClientRect();
    if (r.height > 0 && r.top > window.innerHeight / 2)
      limite = Math.min(limite, r.top);
  }
  return limite;
}

function prefereMenosMovimento(): boolean {
  try {
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  } catch {
    return false;
  }
}

/** A parte da tela que a pessoa vê (a janela, ou a área visível com zoom). */
interface Tela {
  x: number;
  y: number;
  width: number;
  height: number;
}

function telaVisivel(): Tela {
  const vv = window.visualViewport;
  if (vv && vv.width > 0 && vv.height > 0) {
    return {
      x: vv.offsetLeft,
      y: vv.offsetTop,
      width: vv.width,
      height: vv.height,
    };
  }
  return {
    x: 0,
    y: 0,
    width: document.documentElement.clientWidth || window.innerWidth,
    height: window.innerHeight,
  };
}

/** O cartão no meio da tela. */
function noCentro(
  cartao: { width: number; height: number },
  tela: Tela,
): Posicao {
  return {
    modo: "centro",
    top: tela.y + Math.max(MARGEM, (tela.height - cartao.height) / 2),
    left: tela.x + Math.max(MARGEM, (tela.width - cartao.width) / 2),
    alturaMaxima: tela.height - MARGEM * 2,
  };
}

/** Onde o cartão fica em volta do destaque, sem sair da tela. */
function posicionar(
  alvo: Retangulo,
  cartao: { width: number; height: number },
  tela: Tela,
  /** Borda direita da barra lateral, quando o alvo mora nela. */
  bordaDaLateral?: number,
): Posicao {
  const limitar = (valor: number, min: number, max: number) =>
    Math.min(Math.max(valor, min), Math.max(min, max));
  const esquerda = tela.x + MARGEM;
  const direita = tela.x + tela.width - MARGEM;
  const alto = tela.y + MARGEM;
  const baixo = tela.y + tela.height - MARGEM;
  const centroX = limitar(
    alvo.left + alvo.width / 2 - cartao.width / 2,
    esquerda,
    direita - cartao.width,
  );
  const centroY = limitar(
    alvo.top + alvo.height / 2 - cartao.height / 2,
    alto,
    baixo - cartao.height,
  );
  const espacoAbaixo = baixo - (alvo.top + alvo.height) - DISTANCIA;
  const espacoAcima = alvo.top - DISTANCIA - alto;
  const espacoDireita = direita - (alvo.left + alvo.width) - DISTANCIA;
  const espacoEsquerda = alvo.left - DISTANCIA - esquerda;

  // Item da barra lateral: o cartão vai logo depois da coluna, à direita.
  if (
    bordaDaLateral !== undefined &&
    direita - bordaDaLateral - DISTANCIA >= cartao.width
  ) {
    return { modo: "ancorado", top: centroY, left: bordaDaLateral + DISTANCIA };
  }
  if (espacoAbaixo >= cartao.height)
    return {
      modo: "ancorado",
      top: alvo.top + alvo.height + DISTANCIA,
      left: centroX,
    };
  if (espacoAcima >= cartao.height)
    return {
      modo: "ancorado",
      top: alvo.top - DISTANCIA - cartao.height,
      left: centroX,
    };
  if (espacoDireita >= cartao.width)
    return {
      modo: "ancorado",
      top: centroY,
      left: alvo.left + alvo.width + DISTANCIA,
    };
  if (espacoEsquerda >= cartao.width)
    return {
      modo: "ancorado",
      top: centroY,
      left: alvo.left - DISTANCIA - cartao.width,
    };
  // Não cabe inteiro em lado nenhum (celular): o cartão fica do lado com
  // mais espaço, mais baixo, e rola por dentro. O destaque segue à vista.
  const espaco = Math.max(espacoAbaixo, espacoAcima);
  if (espaco >= ALTURA_MINIMA_CARTAO) {
    return {
      modo: "ancorado",
      top:
        espacoAbaixo >= espacoAcima ? alvo.top + alvo.height + DISTANCIA : alto,
      left: centroX,
      alturaMaxima: espaco,
      apertado: true,
    };
  }
  return noCentro(cartao, tela);
}

/** O destaque está dentro da parte visível da tela. */
function dentroDaTela(alvo: Retangulo, tela: Tela): boolean {
  return (
    alvo.top + alvo.height > tela.y &&
    alvo.top < tela.y + tela.height &&
    alvo.left + alvo.width > tela.x &&
    alvo.left < tela.x + tela.width
  );
}

export interface CartaoTourProps {
  passo: Passo;
  indice: number;
  total: number;
  caminhoAtual: string;
  /** A tela do passo ainda está carregando: Próximo e Voltar esperam. */
  navegando?: boolean;
  aoVoltar: () => void;
  aoAvancar: () => void;
  aoPular: () => void;
  aoConcluir: () => void;
  aoRever: () => void;
}

export function CartaoTour({
  passo,
  indice,
  total,
  caminhoAtual,
  navegando = false,
  aoVoltar,
  aoAvancar,
  aoPular,
  aoConcluir,
  aoRever,
}: CartaoTourProps) {
  const idTitulo = useId();
  const idDescricao = useId();
  const idMais = useId();
  const cartaoRef = useRef<HTMLDivElement>(null);
  const [medida, definirMedida] = useState<Medida | null>(null);
  // "Ver mais" aberto vale só para o passo em que foi aberto.
  const [abertoEm, definirAbertoEm] = useState<string | null>(null);
  // Rolagens já feitas neste passo (cada uma acontece uma vez só).
  const rolagensRef = useRef(new Set<string>());

  const aberto = abertoEm === passo.id;
  const atual = medida?.passoId === passo.id ? medida : null;
  const destaque = atual?.destaque ?? null;
  const posicao = atual?.posicao ?? null;
  const emMais = atual?.emMais ?? false;

  const primeiro = indice === 0;
  const ultimo = passo.tipo === "encerramento" || indice === total - 1;
  const aVista = partesAVista(passo);
  const temMais =
    (!!passo.ondeFica && !aVista.ondeFica) || (!!passo.dica && !aVista.dica);

  // O foco vai para o cartão ao abrir e a cada passo.
  useEffect(() => {
    rolagensRef.current.clear();
    cartaoRef.current?.focus({ preventScroll: true });
  }, [passo.id]);

  const medir = useCallback(() => {
    const cartao = cartaoRef.current;
    if (!cartao) return;
    const { el, emMais: noMais } = alvoDoPasso(passo);
    // A parte visível da tela (não o vw: tela que rola de lado infla o vw).
    const tela = telaVisivel();
    const largura =
      tela.width >= LARGURA_COMPUTADOR
        ? LARGURA_CARTAO_COMPUTADOR
        : Math.min(LARGURA_CARTAO_CELULAR, tela.width - MARGEM * 2);
    // Altura natural (o cartão encolhido rola por dentro).
    const tamanho = { width: largura, height: cartao.scrollHeight + 2 };
    let nova: Medida = {
      passoId: passo.id,
      destaque: null,
      posicao: noCentro(tamanho, tela),
      emMais: noMais,
      largura,
    };
    if (el) {
      // Leva o alvo para a vista uma vez por passo (lista lateral comprida,
      // elemento da página mais abaixo).
      if (!rolagensRef.current.has(`${passo.id}:vista`)) {
        rolagensRef.current.add(`${passo.id}:vista`);
        const antes = el.getBoundingClientRect();
        const naNavegacao = !!el.closest("nav");
        // A navegação em pílula do celular cobre o pé da tela.
        const fora =
          antes.top < 0 ||
          antes.bottom > (naNavegacao ? window.innerHeight : limiteDeBaixo());
        if (fora || naNavegacao) {
          el.scrollIntoView?.({
            block: naNavegacao ? "nearest" : "center",
            inline: "nearest",
            behavior: prefereMenosMovimento() ? "auto" : "smooth",
          });
        }
      }
      const r = el.getBoundingClientRect();
      const ret: Retangulo = {
        top: r.top - FOLGA_DESTAQUE,
        left: r.left - FOLGA_DESTAQUE,
        width: r.width + FOLGA_DESTAQUE * 2,
        height: r.height + FOLGA_DESTAQUE * 2,
        raio: window.getComputedStyle(el).borderRadius || "0px",
      };
      // A barra lateral é uma coluna presa à esquerda, mais alta que meia tela.
      const coluna = el.closest("nav")?.getBoundingClientRect();
      const bordaDaLateral =
        coluna &&
        coluna.left <= 1 &&
        coluna.width < 320 &&
        coluna.height > window.innerHeight / 2
          ? coluna.right
          : undefined;
      const posicao = posicionar(ret, tamanho, tela, bordaDaLateral);
      // Elemento da página sem espaço em volta para o cartão (celular): sobe
      // o elemento para o alto da tela, e o cartão cabe embaixo dele.
      const naPagina = !el.closest("nav");
      const chave = `${passo.id}:alto`;
      if (
        (posicao.modo === "centro" || posicao.apertado) &&
        naPagina &&
        !rolagensRef.current.has(chave)
      ) {
        rolagensRef.current.add(chave);
        el.scrollIntoView?.({
          block: "start",
          inline: "nearest",
          behavior: prefereMenosMovimento() ? "auto" : "smooth",
        });
      }
      // Alvo preso fora da parte visível (navegação fixa numa tela que
      // rola de lado): o cartão fica no centro, sem destaque.
      if (dentroDaTela(ret, tela)) nova = { ...nova, destaque: ret, posicao };
    }
    definirMedida((anterior) =>
      mesmaMedida(anterior, nova) ? anterior : nova,
    );
  }, [passo]);

  // Mede depois de pintar e de novo quando a tela de fundo muda (navegação,
  // lista que carrega, rolagem, cartão que cresce no "Ver mais").
  useEffect(() => {
    const quadro =
      typeof window.requestAnimationFrame === "function"
        ? window.requestAnimationFrame.bind(window)
        : (fn: () => void) => window.setTimeout(fn, 16);
    const cancelar =
      typeof window.cancelAnimationFrame === "function"
        ? window.cancelAnimationFrame.bind(window)
        : window.clearTimeout.bind(window);
    let pedido = 0;
    const agendar = () => {
      cancelar(pedido);
      pedido = quadro(medir);
    };
    agendar();
    window.addEventListener("resize", agendar);
    window.addEventListener("scroll", agendar, true);
    const observador =
      typeof MutationObserver !== "undefined"
        ? new MutationObserver(agendar)
        : null;
    observador?.observe(document.body, { childList: true, subtree: true });
    const tamanho =
      typeof ResizeObserver !== "undefined"
        ? new ResizeObserver(agendar)
        : null;
    if (tamanho && cartaoRef.current) tamanho.observe(cartaoRef.current);
    return () => {
      cancelar(pedido);
      window.removeEventListener("resize", agendar);
      window.removeEventListener("scroll", agendar, true);
      observador?.disconnect();
      tamanho?.disconnect();
    };
  }, [medir]);

  const aoTeclar = (evento: KeyboardEvent<HTMLDivElement>) => {
    if (evento.key === "Escape") {
      evento.preventDefault();
      aoPular();
    } else if (evento.key === "ArrowRight") {
      evento.preventDefault();
      if (navegando) return;
      if (ultimo) aoConcluir();
      else aoAvancar();
    } else if (evento.key === "ArrowLeft" && !primeiro) {
      evento.preventDefault();
      if (navegando) return;
      aoVoltar();
    }
  };

  // Esc também fecha quando o foco saiu do cartão para o corpo da página.
  useEffect(() => {
    const aoTeclarNaPagina = (evento: globalThis.KeyboardEvent) => {
      if (evento.key !== "Escape") return;
      if (document.activeElement && document.activeElement !== document.body)
        return;
      aoPular();
    };
    document.addEventListener("keydown", aoTeclarNaPagina);
    return () => document.removeEventListener("keydown", aoTeclarNaPagina);
  }, [aoPular]);

  const progresso = ((indice + 1) / total) * 100;
  // Já está na tela do passo (ou na tela onde ela mora, como as
  // transferências dentro de Conversas): o atalho "Abrir esta tela" some.
  const naTela = [passo.caminho, passo.alvoDoMenu].some(
    (caminho) =>
      caminho !== null &&
      (caminhoAtual === caminho || caminhoAtual.startsWith(`${caminho}/`)),
  );

  return (
    <>
      {/* Véu: a sombra larga do destaque escurece a tela em volta e deixa o
          alvo aceso, com o mesmo arredondado dele. Sem alvo, a tela inteira.
          Não segura clique: a tela de fundo continua tocável. */}
      <div
        aria-hidden="true"
        data-tour-veu=""
        className="pointer-events-none fixed inset-0 z-[var(--z-aviso)] overflow-hidden"
      >
        {destaque ? (
          <div
            data-tour-destaque=""
            className="outline-dourado absolute outline-2 motion-safe:transition-[top,left,width,height] motion-safe:duration-220"
            style={{
              top: destaque.top,
              left: destaque.left,
              width: destaque.width,
              height: destaque.height,
              borderRadius: `calc(${destaque.raio} + ${FOLGA_DESTAQUE}px)`,
              boxShadow: VEU,
            }}
          />
        ) : (
          <div className="absolute inset-0" style={{ background: COR_VEU }} />
        )}
      </div>

      <div
        ref={cartaoRef}
        role="dialog"
        aria-modal="false"
        aria-labelledby={idTitulo}
        aria-describedby={idDescricao}
        tabIndex={-1}
        onKeyDown={aoTeclar}
        data-tour-cartao={passo.id}
        className={cn(
          "rounded-3 border-linha bg-superficie shadow-2 fixed z-[var(--z-aviso)] flex max-h-[calc(100dvh-32px)] w-[calc(100vw-32px)] max-w-[400px] flex-col overflow-y-auto border p-5 outline-none lg:w-[372px] lg:p-6",
          // Antes da primeira medida: no centro, pelo CSS.
          !posicao && "top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2",
          // Até a primeira medida do passo, o cartão espera invisível no
          // lugar (um quadro), para não piscar no centro e pular para o alvo.
          "motion-safe:transition-opacity motion-safe:duration-140",
          !atual && "opacity-0",
        )}
        style={
          posicao && atual
            ? {
                top: posicao.top,
                left: posicao.left,
                width: atual.largura,
                maxWidth: atual.largura,
                maxHeight: posicao.alturaMaxima,
              }
            : undefined
        }
      >
        <div className="flex items-center justify-between gap-3">
          <p className="text-apoio text-texto-2 font-mono tabular-nums">
            {TEXTOS_TOUR.passoDe(indice + 1, total)}
          </p>
          {!ultimo ? (
            <button
              type="button"
              onClick={aoPular}
              className="text-apoio text-texto-2 hover:bg-marinho-08 hover:text-texto -mr-2 inline-flex min-h-[44px] items-center rounded-[7px] px-2 underline decoration-1 underline-offset-4"
            >
              {TEXTOS_TOUR.pular}
            </button>
          ) : null}
        </div>
        <Barra
          valor={progresso}
          rotulo={TEXTOS_TOUR.progresso}
          className="mt-1 h-1"
        />

        <p className="text-mini text-dourado-texto mt-4 font-semibold tracking-[0.12em] uppercase">
          {passo.grupo}
        </p>
        <h2
          id={idTitulo}
          className="font-titulo text-1 text-texto mt-1 font-normal"
        >
          {passo.titulo}
        </h2>
        {passo.meta ? (
          <p className="text-apoio text-texto-2 mt-2 flex items-center gap-1.5">
            <Clock aria-hidden="true" className="size-4 shrink-0" />
            {passo.meta}
          </p>
        ) : null}
        {emMais ? (
          <p className="text-apoio text-dourado-texto bg-dourado-lavado rounded-2 mt-3 px-3 py-2">
            {TEXTOS_TOUR.ficaEmMais}
          </p>
        ) : null}

        <p id={idDescricao} className="text-corpo text-texto mt-3">
          {passo.serve}
        </p>

        {passo.fazer.length > 0 ? (
          <div className="mt-4">
            <p className="text-apoio text-texto-2 font-semibold">
              {passo.tipo === "abertura"
                ? TEXTOS_TOUR.comoFunciona
                : passo.ordenado
                  ? TEXTOS_TOUR.naOrdem
                  : TEXTOS_TOUR.oQueFazer}
            </p>
            {passo.ordenado ? (
              <ol className="mt-2 flex flex-col gap-2">
                {passo.fazer.map((item, i) => (
                  <li
                    key={item}
                    className="text-corpo text-texto flex items-start gap-3"
                  >
                    <span
                      aria-hidden="true"
                      className="bg-marinho text-texto-inverso rounded-pilula text-mini grid size-6 shrink-0 place-items-center font-semibold"
                    >
                      {i + 1}
                    </span>
                    <span className="pt-0.5">{item}</span>
                  </li>
                ))}
              </ol>
            ) : (
              <ul className="mt-2 flex flex-col gap-1.5">
                {passo.fazer.map((item) => (
                  <li
                    key={item}
                    className="text-corpo text-texto flex items-start gap-2.5"
                  >
                    <ArrowRight
                      aria-hidden="true"
                      className="text-dourado-texto mt-[0.3em] size-4 shrink-0"
                    />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        ) : null}

        {aVista.ondeFica ? (
          <Linha icone={<MapPin />} rotulo={TEXTOS_TOUR.ondeFica}>
            {passo.ondeFica}
          </Linha>
        ) : null}
        {aVista.dica ? (
          <Linha icone={<Lightbulb />} rotulo={TEXTOS_TOUR.dica}>
            {passo.dica}
          </Linha>
        ) : null}
        {temMais ? (
          <>
            <div id={idMais} hidden={!aberto}>
              {passo.ondeFica && !aVista.ondeFica ? (
                <Linha icone={<MapPin />} rotulo={TEXTOS_TOUR.ondeFica}>
                  {passo.ondeFica}
                </Linha>
              ) : null}
              {passo.dica && !aVista.dica ? (
                <Linha icone={<Lightbulb />} rotulo={TEXTOS_TOUR.dica}>
                  {passo.dica}
                </Linha>
              ) : null}
            </div>
            <button
              type="button"
              aria-expanded={aberto}
              aria-controls={idMais}
              onClick={() => definirAbertoEm(aberto ? null : passo.id)}
              className="text-apoio text-texto hover:bg-marinho-08 mt-2 -ml-2 inline-flex min-h-[44px] items-center gap-1.5 self-start rounded-[7px] px-2 font-semibold"
            >
              {aberto ? TEXTOS_TOUR.verMenos : TEXTOS_TOUR.verMais}
              <ChevronDown
                aria-hidden="true"
                className={cn(
                  "size-4 motion-safe:transition-transform motion-safe:duration-140",
                  aberto && "rotate-180",
                )}
              />
            </button>
          </>
        ) : null}

        {passo.tipo === "tela" && passo.caminho && !naTela ? (
          <Link
            href={passo.caminho}
            className="text-apoio text-texto mt-3 inline-flex min-h-[44px] items-center gap-1.5 self-start font-semibold underline decoration-1 underline-offset-4"
          >
            {TEXTOS_TOUR.abrirTela}
            <ArrowRight aria-hidden="true" className="size-4" />
          </Link>
        ) : null}

        <div className="border-linha mt-5 flex flex-wrap items-center justify-end gap-2 border-t pt-4">
          {ultimo ? (
            <button
              type="button"
              onClick={aoRever}
              className="text-corpo border-fio-2 bg-superficie text-texto hover:bg-creme-2 mr-auto inline-flex min-h-[44px] items-center gap-2 rounded-[7px] border px-4 font-medium"
            >
              <RotateCcw aria-hidden="true" className="size-4" />
              {TEXTOS_TOUR.reverTour}
            </button>
          ) : !primeiro ? (
            <button
              type="button"
              onClick={() => {
                if (!navegando) aoVoltar();
              }}
              aria-disabled={navegando || undefined}
              className="text-corpo text-texto-2 hover:bg-marinho-08 hover:text-texto mr-auto inline-flex min-h-[44px] items-center gap-1.5 rounded-[7px] px-3 font-medium aria-disabled:cursor-progress"
            >
              <ArrowLeft aria-hidden="true" className="size-4" />
              {TEXTOS_TOUR.voltar}
            </button>
          ) : null}
          <button
            type="button"
            onClick={() => {
              if (navegando) return;
              if (ultimo) aoConcluir();
              else aoAvancar();
            }}
            aria-disabled={navegando || undefined}
            className="text-corpo border-acao bg-acao text-acao-texto hover:bg-acao-hover inline-flex min-h-[44px] min-w-[128px] items-center justify-center gap-2 rounded-[7px] border px-5 font-semibold aria-disabled:cursor-progress"
          >
            {ultimo
              ? TEXTOS_TOUR.concluir
              : primeiro
                ? TEXTOS_TOUR.comecar
                : TEXTOS_TOUR.proximo}
            {!ultimo ? (
              <ArrowRight aria-hidden="true" className="size-4" />
            ) : null}
          </button>
        </div>
      </div>
    </>
  );
}

function Linha({
  icone,
  rotulo,
  children,
}: {
  icone: ReactNode;
  rotulo: string;
  children: ReactNode;
}) {
  return (
    <div className="bg-creme-2 rounded-2 mt-3 flex items-start gap-2.5 px-3 py-2.5">
      <span
        aria-hidden="true"
        className="text-dourado-texto mt-0.5 shrink-0 [&_svg]:size-4"
      >
        {icone}
      </span>
      <p className="text-apoio text-texto">
        <span className="font-semibold">{rotulo}. </span>
        {children}
      </p>
    </div>
  );
}
