import * as React from "react";
import Image from "next/image";
import Link from "next/link";
import { cn } from "@/lib/utils";

/**
 * Barra lateral no desenho do HTML da cliente (`.side`): coluna marinho de
 * 224 px, colada nas bordas, com o símbolo e o nome do sistema no topo (com
 * divisor), grupos com rótulo de 9 px em caixa alta, itens de 12,5 px, o
 * ativo em dourado translúcido com filete na esquerda e selos de contagem
 * dourado (neutro) e vermelho (alerta). Mostra só o que o papel pode abrir.
 *
 * Este componente é estático (sem papel): os grupos e itens vêm sempre por
 * propriedade. Os grupos por papel (Comercial, Operação, Experiência,
 * Gestão, Sistema) são da casca do app.
 *
 * A visibilidade por tamanho de tela (`hidden lg:flex`) não mora aqui: a
 * casca decide isso (`visivelEm`), porque um componente que já esconde a
 * si mesmo deixa uma caixa vazia quando alguém, como a vitrine do design
 * system, precisa mostrá-lo fora do computador.
 */
export interface ItemBarraLateral {
  rotulo: string;
  href: string;
  icone: React.ReactNode;
  ativo?: boolean;
  contador?: number;
  /** Contador em destaque (fundo areia), em vez do contador neutro padrão. */
  contadorAlerta?: boolean;
  /** Rótulo completo do contador para o leitor de tela (ex: "2 alertas"). Sem isto, "Alertas" e "2" viram um nome acessível só "Alertas2". */
  rotuloContador?: string;
  /** Marca do tour guiado (`data-tour`): o caminho da rota, para o destaque do passo. */
  idTour?: string;
}

export interface GrupoBarraLateral {
  titulo: string;
  itens: ItemBarraLateral[];
}

export interface BarraLateralProps {
  /** Nome do sistema, ao lado do símbolo (ex: "Kraamzorg OS"). */
  nomeMarca: string;
  /** Caminho do símbolo para fundo escuro (versão negativa do guia da marca, inteiro), em `/public/brand`. */
  logoSrc: string;
  grupos: GrupoBarraLateral[];
  /** Rótulo acessível da navegação (ex: "Navegação principal"). O nome da marca não é o rótulo da navegação. */
  rotulo: string;
  /** Rodapé opcional (nome e papel da pessoa logada). */
  rodape?: React.ReactNode;
  /** Quando mostrar a barra: "sempre" (padrão) ou só a partir do computador. */
  visivelEm?: "sempre" | "computador";
  /** "fixa" (padrão) presa na lateral da tela; "solta" dentro do fluxo (vitrine). */
  posicao?: "fixa" | "solta";
  className?: string;
}

export function BarraLateral({
  nomeMarca,
  logoSrc,
  grupos,
  rotulo,
  rodape,
  visivelEm = "sempre",
  posicao = "fixa",
  className,
}: BarraLateralProps) {
  return (
    <nav
      aria-label={rotulo}
      className={cn(
        "bg-marinho text-texto-inverso flex flex-col overflow-hidden py-3.5",
        posicao === "fixa" ? "sticky top-0 h-dvh w-[224px]" : "rounded-3",
        visivelEm === "computador" && "hidden lg:flex",
        className,
      )}
    >
      <div className="border-texto-inverso/10 mb-3 flex shrink-0 items-center gap-2.5 border-b px-[18px] pt-0.5 pb-4">
        {/* O símbolo é o arquivo oficial do guia da marca, inteiro e sem moldura de corte: nenhuma tela redesenha a logo. */}
        <Image
          src={logoSrc}
          alt=""
          aria-hidden="true"
          width={29}
          height={36}
          priority
          className="h-9 w-auto shrink-0"
        />
        <span aria-hidden="true" className="font-titulo flex flex-col">
          <span className="text-creme text-[11px] tracking-[0.2em]">
            KRAAMZORG
          </span>
          <span className="text-dourado-2 mt-0.5 text-[7.5px] tracking-[0.24em]">
            BRASIL · OS
          </span>
        </span>
        <span className="sr-only">{nomeMarca}</span>
      </div>

      <div className="rolagem-fina-inversa flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto px-2.5">
        {grupos.map((grupo) => {
          const idGrupo = `barra-lateral-grupo-${grupo.titulo.toLowerCase().replace(/\s+/g, "-")}`;
          return (
            <div key={grupo.titulo} className="flex flex-col">
              <span
                id={idGrupo}
                className="text-texto-inverso-2 px-2 pt-2.5 pb-1 text-[9px] font-semibold tracking-[0.16em] uppercase"
              >
                {grupo.titulo}
              </span>
              <ul aria-labelledby={idGrupo} className="flex flex-col">
                {grupo.itens.map((item) => (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      title={item.rotulo}
                      aria-current={item.ativo ? "page" : undefined}
                      data-tour={item.idTour}
                      className={cn(
                        "ease-estado flex w-full items-center gap-[9px] rounded-[7px] px-[9px] py-1.5 text-left text-[12.5px] no-underline transition-[background-color,color] duration-140",
                        "[&>svg]:size-[15px] [&>svg]:shrink-0",
                        item.ativo
                          ? "bg-dourado-2/15 text-creme [&>svg]:text-dourado-2 font-medium shadow-[inset_2px_0_0_var(--dourado-2)]"
                          : "text-texto-inverso/80 hover:bg-texto-inverso/8 hover:text-creme [&>svg]:text-texto-inverso-2",
                      )}
                    >
                      {item.icone}
                      <span className="min-w-0 truncate">{item.rotulo}</span>
                      {item.contador ? (
                        <span
                          aria-hidden="true"
                          className={cn(
                            "ml-auto min-w-[18px] shrink-0 rounded-full px-1.5 py-px text-center text-[10px] font-bold",
                            item.contadorAlerta
                              ? "bg-alerta text-branco"
                              : "bg-dourado text-marinho",
                          )}
                        >
                          {item.contador}
                        </span>
                      ) : null}
                      {item.contador && item.rotuloContador ? (
                        <span className="sr-only">, {item.rotuloContador}</span>
                      ) : null}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </div>

      {rodape ? (
        <div className="border-texto-inverso/10 mt-2 shrink-0 border-t px-[18px] pt-3.5">
          {rodape}
        </div>
      ) : null}
    </nav>
  );
}
