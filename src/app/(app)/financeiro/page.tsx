import type { Metadata } from "next";
import { CabecalhoTela } from "@/components/shell/cabecalho-tela";
import { AvisoAcesso } from "@/components/shell/aviso-acesso";
import { FaixaAlerta } from "@/components/ui/faixa-alerta";
import { exigirSessao } from "@/lib/auth/sessao";
import { hojeEmBrasilia } from "@/lib/agenda/datas";
import { buscaParaMes } from "@/lib/gestao/formato";
import { inicioDoMes } from "@/lib/gestao/financeiro";
import { obterTelaVisaoFinanceira } from "@/modules/financeiro/gestao/dados";
import {
  NavegacaoFinanceiro,
  SeletorMes,
} from "@/modules/financeiro/gestao/componentes/navegacao-financeiro";
import {
  VisaoFinanceiraTela,
  fraseDoMes,
} from "@/modules/financeiro/gestao/componentes/visao-financeira";

export const metadata: Metadata = { title: "Financeiro · Kraamzorg OS" };

/**
 * Financeiro (P46): DRE gerencial do mês, inadimplência e previsão de
 * recebimentos. Financeiro e diretoria, em AAL2 (PRD 13).
 */
export default async function PaginaFinanceiro({
  searchParams,
}: {
  searchParams: Promise<{ mes?: string }>;
}) {
  const { mes: busca } = await searchParams;
  const usuario = await exigirSessao("/financeiro");
  const hoje = hojeEmBrasilia();
  const mes = buscaParaMes(busca) ?? inicioDoMes(hoje);

  let tela: Awaited<ReturnType<typeof obterTelaVisaoFinanceira>> | null = null;
  try {
    tela = await obterTelaVisaoFinanceira(usuario, mes);
  } catch (erro) {
    console.error(
      "[tela-erro] /financeiro",
      erro instanceof Error ? erro.message : erro,
    );
    tela = null;
  }

  return (
    <>
      <CabecalhoTela
        sobretitulo="Visão do mês"
        titulo="Financeiro"
        subtitulo={
          tela?.situacao === "ok"
            ? fraseDoMes(tela.dados)
            : "O que entrou, o que saiu e o que ainda vai entrar."
        }
      />
      <div className="flex flex-col gap-3.5 pt-6">
        <div
          data-tour="/financeiro:abas"
          className="flex flex-wrap items-center gap-3"
        >
          <NavegacaoFinanceiro atual="/financeiro" mes={mes} />
          <SeletorMes mes={mes} hoje={hoje} caminho="/financeiro" />
        </div>
        {!tela ? (
          <FaixaAlerta variante="erro" titulo="O financeiro não abriu agora">
            Confira a conexão e recarregue a página. Nada foi alterado.
          </FaixaAlerta>
        ) : tela.situacao === "ok" ? (
          <VisaoFinanceiraTela v={tela.dados} />
        ) : (
          <AvisoAcesso
            situacao={tela.situacao}
            caminho="/financeiro"
            aalPossivel={usuario.aalPossivel}
            motivoMfa="O financeiro mostra valores e pagamentos, por isso pede o código do aplicativo de verificação antes de abrir."
            motivoPapel="O financeiro é da equipe financeira e da diretoria. O comercial vê a situação de cada cobrança no contrato da família."
            tituloPapel="O financeiro não faz parte da sua função"
          />
        )}
      </div>
    </>
  );
}
