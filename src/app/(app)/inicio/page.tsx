import type { Metadata } from "next";
import { exigirSessao } from "@/lib/auth/sessao";
import { papelPrincipal } from "@/lib/navegacao";
import {
  InicioComercial,
  InicioFinanceiro,
  InicioMarketing,
} from "@/modules/inicio/inicio-papeis";
import { InicioCoordenacao, InicioDiretoria } from "./inicio-gestao";

export const metadata: Metadata = { title: "Início · Kraamzorg OS" };

/**
 * Dono: P18 (fila e tarefas do comercial) e P27 (transferências); cada
 * papel ganha o próprio Início no módulo dele (coordenação P36, financeiro
 * P46, marketing P47, diretoria P52). Coordenação e diretoria: montados no
 * polimento da direção "Colo", com as leituras que já existiam.
 */
export default async function PaginaInicio() {
  const sessao = await exigirSessao();
  const principal = papelPrincipal(sessao.papeis);

  if (principal === "comercial") {
    return <InicioComercial usuarioId={sessao.usuarioId} nome={sessao.nome} />;
  }
  if (principal === "coordenacao") {
    return <InicioCoordenacao sessao={sessao} />;
  }
  if (principal === "financeiro") return <InicioFinanceiro sessao={sessao} />;
  if (principal === "marketing") return <InicioMarketing sessao={sessao} />;
  return <InicioDiretoria sessao={sessao} />;
}
