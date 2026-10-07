import type { Metadata } from "next";
import Link from "next/link";
import { LockKeyhole } from "lucide-react";
import { CabecalhoTela } from "@/components/shell/cabecalho-tela";
import { Botao } from "@/components/ui/botao";
import { BlocoForm } from "@/modules/financeiro/mockup-ui";
import { FaixaAlerta } from "@/components/ui/faixa-alerta";
import { exigirSessao } from "@/lib/auth/sessao";
import { hojeBrasilia } from "@/modules/crm/pipeline/idade-gestacional";
import { obterTelaMarketing } from "@/modules/marketing/dados";
import { periodoDaBusca } from "@/modules/marketing/periodo";
import { FormularioCusto } from "@/modules/marketing/componentes/form-custo";
import { GeradorLinks } from "@/modules/marketing/componentes/gerador-links";
import {
  RelatorioMarketingTela,
  TabelasCanaisMarketing,
} from "@/modules/marketing/componentes/relatorio-marketing";
import { AbasPilula } from "@/components/ui/abas-pilula";

export const metadata: Metadata = { title: "Marketing · Kraamzorg OS" };

/**
 * Marketing, atribuição e página de captação (P47): os links por canal com o
 * código de origem, o relatório de leads, receita e custo por origem e por
 * canal, o custo do mês (vindo do financeiro) e a exportação de famílias
 * elegíveis. Cada bloco aparece conforme o papel (PRD 13).
 */
export default async function PaginaMarketing({
  searchParams,
}: {
  searchParams: Promise<{ desde?: string; ate?: string; aba?: string }>;
}) {
  const usuario = await exigirSessao("/marketing");
  const busca = await searchParams;
  const periodo = periodoDaBusca(busca);
  const aba = busca.aba === "canais" ? "canais" : "geral";
  const filtroUrl =
    periodo.desde || periodo.ate
      ? `desde=${periodo.desde ?? ""}&ate=${periodo.ate ?? ""}`
      : "";

  let tela: Awaited<ReturnType<typeof obterTelaMarketing>> | null = null;
  try {
    tela = await obterTelaMarketing(usuario, periodo);
  } catch (erro) {
    console.error(
      "[tela-erro] /marketing",
      erro instanceof Error ? erro.message : erro,
    );
    tela = null;
  }

  return (
    <>
      <CabecalhoTela
        sobretitulo="Gestão"
        titulo="Marketing"
        subtitulo="De onde as famílias chegam, quanto cada canal custou e o que virou contrato."
      />
      <div className="flex flex-col gap-3.5 pt-6">
        {!tela ? (
          <FaixaAlerta variante="erro" titulo="O marketing não abriu agora">
            Confira a conexão e recarregue a página. Nada foi alterado.
          </FaixaAlerta>
        ) : tela.situacao === "mfa" ? (
          <div className="rounded-3 bg-superficie shadow-1 flex max-w-[560px] flex-col gap-3 p-5">
            <p className="text-corpo text-texto flex items-start gap-3">
              <LockKeyhole
                className="text-texto-2 mt-1 size-4 shrink-0"
                aria-hidden="true"
                strokeWidth={1.75}
              />
              O marketing mostra receita e custo, por isso pede o código do
              aplicativo (MFA) antes de abrir.
            </p>
            <Botao
              asChild
              variante="secundario"
              tamanho="compacto"
              className="self-start"
            >
              <Link
                href={`${usuario.aalPossivel === "aal2" ? "/mfa/desafio" : "/mfa/cadastro"}?proximo=${encodeURIComponent("/marketing")}`}
              >
                Confirmar com o código
              </Link>
            </Botao>
          </div>
        ) : (
          <>
            <AbasPilula
              rotulo="Partes do marketing"
              idTour="/marketing:abas"
              ativa={aba}
              larga="celular"
              abas={[
                {
                  valor: "geral",
                  rotulo: "Visão geral",
                  href: filtroUrl ? `/marketing?${filtroUrl}` : "/marketing",
                },
                {
                  valor: "canais",
                  rotulo: "Canais e custos",
                  href: `/marketing?aba=canais${filtroUrl ? `&${filtroUrl}` : ""}`,
                },
              ]}
            />
            {aba === "geral" ? (
              tela.relatorio ? (
                <RelatorioMarketingTela
                  relatorio={tela.relatorio}
                  periodo={tela.periodo}
                  anterior={tela.anterior}
                />
              ) : (
                <FaixaAlerta
                  variante="info"
                  titulo="O relatório não está com o seu papel"
                >
                  O relatório é do marketing, da diretoria e do financeiro. Os
                  links por canal aparecem na outra aba.
                </FaixaAlerta>
              )
            ) : (
              <>
                {tela.relatorio ? (
                  <TabelasCanaisMarketing relatorio={tela.relatorio} />
                ) : null}

                {tela.canais ? (
                  <BlocoForm
                    titulo="Links por canal"
                    nota="Cada canal tem um código que vai no texto da primeira mensagem. Quando a família escreve, a origem já entra certa no cadastro."
                  >
                    <GeradorLinks
                      canais={tela.canais}
                      enderecoBase={tela.enderecoBase}
                    />
                  </BlocoForm>
                ) : null}

                {tela.podeLancarCusto && tela.relatorio ? (
                  <BlocoForm
                    titulo="Custo por canal"
                    nota="O custo do mês entra no custo por lead e por contrato do relatório."
                  >
                    <FormularioCusto
                      canais={tela.relatorio.porCanal.map((c) => ({
                        id: c.canalId,
                        rotulo: `${c.nome} (${c.codigo})`,
                      }))}
                      mesAtual={hojeBrasilia().slice(0, 7)}
                    />
                  </BlocoForm>
                ) : null}

                {tela.podeExportar ? (
                  <BlocoForm
                    titulo="Exportar famílias"
                    nota="O arquivo traz só famílias que podem receber contato de marketing: sem estado sensível e sem quem pediu para não ser contatada. Nunca leva endereço nem histórico de saúde."
                  >
                    <Botao
                      asChild
                      variante="secundario"
                      tamanho="compacto"
                      className="self-start"
                    >
                      <a
                        href={`/marketing/exportar${tela.periodo.desde || tela.periodo.ate ? `?desde=${tela.periodo.desde ?? ""}&ate=${tela.periodo.ate ?? ""}` : ""}`}
                      >
                        Baixar arquivo CSV
                      </a>
                    </Botao>
                  </BlocoForm>
                ) : null}
              </>
            )}
          </>
        )}
      </div>
    </>
  );
}
