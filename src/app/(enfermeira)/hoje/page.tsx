import type { Metadata } from "next";
import Link from "next/link";
import { ClipboardPen } from "lucide-react";
import { CabecalhoTela } from "@/components/shell/cabecalho-tela";
import { saudacao } from "@/components/shell/saudacao";
import { Kpi } from "@/components/mockup";
import { ItemBloco, ListaBlocos } from "@/components/ui/lista-blocos";
import { somarDias } from "@/lib/agenda/datas";
import { exigirSessao } from "@/lib/auth/sessao";
import { obterRepositorios } from "@/lib/dados/fabrica";
import { HojeCliente } from "@/modules/operacao/portal/componentes/hoje-cliente";
import { IndicadorPortal } from "@/modules/operacao/portal/componentes/indicador-portal";
import {
  fraseDoDia,
  resumoDoHoje,
  tituloDeHoje,
  visitasDoDiaSeguinte,
} from "@/modules/operacao/portal/textos";

const LINK_KPI = "rounded-3 block min-h-toque";

export const metadata: Metadata = { title: "Hoje · Kraamzorg OS" };

/**
 * Hoje da enfermeira (P38, fluxo B; direção "Colo", DESIGN.md 2.13): o
 * bloco de abertura com o cumprimento, o dia e o trio de números (visitas
 * de hoje, fichas pendentes, visitas de amanhã); depois as visitas do dia
 * com endereço, horário, contato, chegada e saída, só das famílias
 * atribuídas a ela. O conteúdo é guardado no aparelho por 24 horas e abre
 * sem sinal (página de sem sinal).
 */
export default async function PaginaHoje() {
  const sessao = await exigirSessao("/hoje");
  const { portal } = await obterRepositorios();
  const [hoje, familias] = await Promise.all([
    portal.obterHoje(),
    portal.listarFamilias(),
  ]);
  const amanha = visitasDoDiaSeguinte(familias, somarDias(hoje.dia, 1));
  const resumo = resumoDoHoje(hoje, amanha);

  return (
    <>
      <CabecalhoTela
        abertura
        sobretitulo={saudacao(hoje.profissionalNome || sessao.nome)}
        titulo={tituloDeHoje(hoje.dia)}
        subtitulo={fraseDoDia(hoje.visitas)}
        lateral={<IndicadorPortal />}
      />
      <div className="pt-4">
        <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-3">
          <Link href="#visitas-de-hoje" className={LINK_KPI}>
            <Kpi
              rotulo={resumo.visitas.rotulo}
              valor={hoje.visitas.length}
              delta={resumo.visitas.contexto}
            />
          </Link>
          <Kpi
            rotulo={resumo.fichas.rotulo}
            valor={hoje.fichasPendentes.length}
            delta={resumo.fichas.contexto}
          />
          <Link href="/perfil" className={LINK_KPI}>
            <Kpi
              rotulo={resumo.amanha.rotulo}
              valor={amanha.length}
              delta={resumo.amanha.contexto}
            />
          </Link>
        </div>
      </div>
      <HojeCliente inicial={hoje} familias={familias} hoje={hoje.dia} />
      <ListaBlocos className="pt-6">
        <ItemBloco
          href="/minhas-evolucoes"
          icone={<ClipboardPen />}
          tom="salvia"
          titulo="Evoluções para os médicos"
          apoio="As evoluções que você escreve e manda para a revisão."
        />
      </ListaBlocos>
    </>
  );
}
