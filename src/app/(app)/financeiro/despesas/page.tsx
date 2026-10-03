import type { Metadata } from "next";
import { CabecalhoTela } from "@/components/shell/cabecalho-tela";
import { AvisoAcesso } from "@/components/shell/aviso-acesso";
import { FaixaAlerta } from "@/components/ui/faixa-alerta";
import { exigirSessao } from "@/lib/auth/sessao";
import { hojeEmBrasilia } from "@/lib/agenda/datas";
import { buscaParaMes, mesParaBusca } from "@/lib/gestao/formato";
import { inicioDoMes } from "@/lib/gestao/financeiro";
import { BlocoForm } from "@/modules/financeiro/mockup-ui";
import { obterTelaDespesas } from "@/modules/financeiro/gestao/dados";
import { FormDespesa } from "@/modules/financeiro/gestao/componentes/form-despesa";
import {
  fraseDespesas,
  ListaDespesasTela,
} from "@/modules/financeiro/gestao/componentes/lista-despesas";
import {
  NavegacaoFinanceiro,
  SeletorMes,
} from "@/modules/financeiro/gestao/componentes/navegacao-financeiro";

export const metadata: Metadata = { title: "Despesas · Kraamzorg OS" };

/**
 * Despesas por categoria (P46 item 1): equipe assistencial, marketing e
 * anúncios, deslocamento, contabilidade, tecnologia, pró-labore e outros.
 * Financeiro e diretoria, em AAL2.
 */
export default async function PaginaDespesas({
  searchParams,
}: {
  searchParams: Promise<{ mes?: string; editar?: string }>;
}) {
  const { mes: busca, editar } = await searchParams;
  const usuario = await exigirSessao("/financeiro/despesas");
  const hoje = hojeEmBrasilia();
  const mes = buscaParaMes(busca) ?? inicioDoMes(hoje);

  let tela: Awaited<ReturnType<typeof obterTelaDespesas>> | null = null;
  try {
    tela = await obterTelaDespesas(usuario, mes);
  } catch {
    tela = null;
  }
  const emCorrecao =
    tela?.situacao === "ok"
      ? tela.dados.despesas.find((d) => d.id === editar && !d.daEquipe)
      : undefined;

  return (
    <>
      <CabecalhoTela
        sobretitulo="Financeiro"
        titulo="Despesas"
        subtitulo={
          tela?.situacao === "ok"
            ? fraseDespesas(tela.dados)
            : "O que foi pago, por categoria, para o DRE do mês."
        }
      />
      <div className="flex flex-col gap-3.5 pt-6">
        <div className="flex flex-wrap items-center gap-3">
          <NavegacaoFinanceiro atual="/financeiro/despesas" mes={mes} />
          <SeletorMes mes={mes} hoje={hoje} caminho="/financeiro/despesas" />
        </div>
        {!tela ? (
          <FaixaAlerta variante="erro" titulo="As despesas não abriram agora">
            Confira a conexão e recarregue a página. Nada foi alterado.
          </FaixaAlerta>
        ) : tela.situacao === "ok" ? (
          <>
            <div className="max-w-[720px]">
              <BlocoForm
                titulo={
                  emCorrecao ? "Corrigir a despesa" : "Lançar uma despesa"
                }
                nota="Entra no resultado do mês escolhido acima, na data do pagamento."
              >
                <FormDespesa
                  key={emCorrecao?.id ?? "nova"}
                  hoje={hoje}
                  despesa={emCorrecao}
                  voltarPara={`/financeiro/despesas?mes=${mesParaBusca(mes)}`}
                />
              </BlocoForm>
            </div>
            <ListaDespesasTela lista={tela.dados} />
          </>
        ) : (
          <AvisoAcesso
            situacao={tela.situacao}
            caminho="/financeiro/despesas"
            aalPossivel={usuario.aalPossivel}
            motivoMfa="As despesas são dado financeiro, por isso pedem o código do aplicativo (MFA) antes de abrir."
            motivoPapel="As despesas são da equipe financeira e da diretoria."
            tituloPapel="As despesas não estão com o seu papel"
          />
        )}
      </div>
    </>
  );
}
