"use client";

import { usePathname } from "next/navigation";
import { LogOut } from "lucide-react";
import { AbasInferiores } from "@/components/ui/abas-inferiores";
import { BarraLateral } from "@/components/ui/barra-lateral";
import {
  ativo,
  rotuloLateral,
  type GrupoLateral,
  type ItemNavegacao,
} from "@/lib/navegacao";
import { IconeNavegacao } from "./icones-navegacao";

/**
 * Item de navegação com o contador opcional: na aba Início do comercial,
 * transferências vencendo ou de prioridade máxima (P0 item 1); no item
 * Conversas, quantas conversas esperam alguém (a antiga fila, 30/09), em
 * alerta só quando alguma pede atenção agora. `ItemNavegacao`
 * (src/lib/navegacao) fica sem o campo porque o proxy lê esse tipo sem
 * montar o contador.
 */
export type ItemNavegacaoComContador = ItemNavegacao & {
  contador?: number;
  rotuloContador?: string;
  /** Padrão: em alerta sempre que houver contador. */
  contadorAlerta?: boolean;
};

/**
 * Navegação da casca, ligada ao caminho atual (item ativo). Recebe os
 * itens já filtrados pelo papel (src/lib/navegacao, no servidor): a barra
 * lateral aparece só no computador (1024 px ou mais) e as abas inferiores
 * só abaixo disso (DESIGN.md, seção 3).
 */
export interface NavegacaoAppProps {
  grupos: { titulo: GrupoLateral; itens: ItemNavegacaoComContador[] }[];
  abas: ItemNavegacaoComContador[];
  nome: string;
  papeis: string;
}

/** "ER" de "Edilaine Rossetto": primeira letra do primeiro e do último nome. */
function iniciais(nome: string): string {
  const partes = nome.trim().split(/\s+/).filter(Boolean);
  const primeira = partes[0]?.[0] ?? "";
  const ultima =
    partes.length > 1 ? (partes[partes.length - 1]?.[0] ?? "") : "";
  return (primeira + ultima).toUpperCase();
}

export function NavegacaoLateral({
  grupos,
  nome,
  papeis,
}: Omit<NavegacaoAppProps, "abas">) {
  const caminho = usePathname();
  return (
    <BarraLateral
      nomeMarca="Kraamzorg OS"
      logoSrc="/brand/logo-negativo.png"
      rotulo="Navegação principal"
      visivelEm="computador"
      grupos={grupos.map((grupo) => ({
        titulo: grupo.titulo,
        itens: grupo.itens.map((item) => ({
          rotulo: rotuloLateral(item),
          href: item.caminho,
          icone: <IconeNavegacao nome={item.icone} />,
          ativo: ativo(item, caminho),
          contador: item.contador,
          contadorAlerta:
            Boolean(item.contador) && item.contadorAlerta !== false,
          rotuloContador: item.rotuloContador,
        })),
      }))}
      rodape={
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center gap-[9px]">
            <span
              aria-hidden="true"
              className="bg-dourado-2 text-marinho grid size-[30px] shrink-0 place-items-center rounded-full text-[11.5px] font-semibold"
            >
              {iniciais(nome)}
            </span>
            <div className="min-w-0">
              <p className="text-creme truncate text-[12.5px] font-semibold">
                {nome}
              </p>
              <p className="text-texto-inverso-2 truncate text-[10.5px]">
                {papeis}
              </p>
            </div>
          </div>
          <form action="/sair" method="post">
            <button
              type="submit"
              className="text-texto-inverso hover:bg-lateral-hover -ml-2 inline-flex min-h-8 items-center gap-2 rounded-[7px] px-2 text-[12.5px] font-medium"
            >
              <LogOut
                aria-hidden="true"
                className="text-texto-inverso-2 size-[15px]"
                strokeWidth={1.75}
              />
              Sair
            </button>
          </form>
        </div>
      }
    />
  );
}

export function NavegacaoInferior({
  abas,
  sempre = false,
}: Pick<NavegacaoAppProps, "abas"> & { sempre?: boolean }) {
  const caminho = usePathname();
  // [polimento] Dentro do checklist da visita a navegação em pílula se
  // esconde: fica só a barra de ações da etapa, e a saída é a seta de
  // voltar do cabeçalho (DESIGN.md, 2.9).
  if (sempre && caminho?.startsWith("/visita/")) return null;
  return (
    <AbasInferiores
      rotulo="Navegação principal"
      visivelEm={sempre ? "sempre" : "celular"}
      itens={abas.map((item) => ({
        rotulo: item.rotulo,
        href: item.caminho,
        icone: <IconeNavegacao nome={item.icone} />,
        ativo: ativo(item, caminho),
        contador: item.contador,
        contadorAlerta: item.contadorAlerta,
        rotuloContador: item.rotuloContador,
      }))}
    />
  );
}
