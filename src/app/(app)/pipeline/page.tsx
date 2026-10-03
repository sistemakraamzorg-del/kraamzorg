import type { Metadata } from "next";
import Link from "next/link";
import { Users } from "lucide-react";
import { CabecalhoTela } from "@/components/shell/cabecalho-tela";
import { AbasPilula } from "@/components/ui/abas-pilula";
import { Botao } from "@/components/ui/botao";
import { FaixaAlerta } from "@/components/ui/faixa-alerta";
import { exigirSessao } from "@/lib/auth/sessao";
import { obterRepositorios } from "@/lib/dados/fabrica";
import type { ClassificacaoLead, NumeroPipeline } from "@/lib/dados/tipos";
import { Nota } from "@/components/mockup";
import { GraficosPipeline } from "@/modules/crm/pipeline/componentes/graficos-pipeline";
import { FiltrosPipeline } from "@/modules/crm/pipeline/componentes/filtros-pipeline";
import { FormularioLead } from "@/modules/crm/pipeline/componentes/formulario-lead";
import { QuadroPipeline } from "@/modules/crm/pipeline/componentes/quadro-pipeline";
import { GraficosSomenteLeitura } from "@/modules/crm/pipeline/componentes/graficos-somente-leitura";
import { FiltrosSomenteLeitura } from "@/modules/crm/pipeline/componentes/filtros-somente-leitura";
import { QuadroSomenteLeitura } from "@/modules/crm/pipeline/componentes/quadro-somente-leitura";
import {
  listarAtendimentoTela,
  listarPipelineTela,
  listarPosVendaTela,
} from "@/modules/crm/pipeline/dados";
import {
  ORDEM_P3,
  ORDEM_P4,
  ROTULO_ESTADO_ACOMPANHAMENTO,
  ROTULO_ESTAGIO_P4,
} from "@/modules/crm/pipeline/estagios";
import type {
  AbaPipeline,
  CartaoSomenteLeitura,
} from "@/modules/crm/pipeline/somente-leitura";
import type {
  CartaoPipelineTela,
  FiltroPipelineTela,
} from "@/modules/crm/pipeline/tipos";

export const metadata: Metadata = { title: "Pipeline · Kraamzorg OS" };

type Pesquisa = Record<string, string | string[] | undefined>;

function texto(pesquisa: Pesquisa, chave: string): string | undefined {
  const valor = pesquisa[chave];
  const primeiro = Array.isArray(valor) ? valor[0] : valor;
  return primeiro?.trim() || undefined;
}

function numero(pesquisa: Pesquisa, chave: string): number | undefined {
  const bruto = texto(pesquisa, chave);
  if (!bruto) return undefined;
  const valor = Number(bruto);
  return Number.isFinite(valor) ? valor : undefined;
}

/**
 * Pipeline comercial (P15): lista agrupada por estágio no celular, kanban
 * no computador (protótipo `comercial-pipeline.html`). Pipeline 1 é
 * "Entrada e qualificação"; pipeline 2, "Venda e pré-atendimento" (PRD 7.1
 * e 7.2). A rota é registrada em `src/lib/navegacao` pela casca (P10); esta
 * página só troca o conteúdo, dentro de `src/app/(app)/pipeline`.
 */
export default async function PaginaPipeline({
  searchParams,
}: {
  searchParams: Promise<Pesquisa>;
}) {
  const sessao = await exigirSessao("/pipeline");
  const pesquisa = await searchParams;
  const bruto = texto(pesquisa, "pipeline");
  const aba: AbaPipeline =
    bruto === "2" ? 2 : bruto === "3" ? 3 : bruto === "4" ? 4 : 1;
  // As abas 3 e 4 só leem; o filtro e os gráficos de 1 e 2 usam 1 ou 2.
  const pipeline: NumeroPipeline = aba === 2 ? 2 : 1;
  const podeCadastrar =
    sessao.papeis.includes("comercial") || sessao.papeis.includes("diretoria");

  const filtro: FiltroPipelineTela = {
    pipeline,
    regiaoId: texto(pesquisa, "regiaoId"),
    classificacao: texto(pesquisa, "classificacao") as
      ClassificacaoLead | undefined,
    busca: texto(pesquisa, "busca"),
    minhas: texto(pesquisa, "minhas") === "1",
    semanasMin: numero(pesquisa, "semanasMin"),
    semanasMax: numero(pesquisa, "semanasMax"),
  };

  let cartoes: CartaoPipelineTela[] = [];
  let regioes: Awaited<
    ReturnType<
      Awaited<
        ReturnType<typeof obterRepositorios>
      >["configuracoes"]["listarRegioes"]
    >
  > = [];
  let leitura: CartaoSomenteLeitura[] = [];
  let posVendaRestrito = false;
  let falhou = false;
  try {
    const { configuracoes } = await obterRepositorios();
    if (aba <= 2) {
      [cartoes, regioes] = await Promise.all([
        listarPipelineTela(filtro),
        configuracoes.listarRegioes(),
      ]);
    } else if (aba === 3) {
      const regiaoId = texto(pesquisa, "regiaoId");
      [leitura, regioes] = await Promise.all([
        listarAtendimentoTela({ regiaoId, busca: filtro.busca }),
        configuracoes.listarRegioes(),
      ]);
    } else {
      const r = await listarPosVendaTela(filtro.busca);
      leitura = r.cartoes;
      posVendaRestrito = r.restrito;
    }
  } catch {
    falhou = true;
  }
  const colunasLeitura =
    aba === 3
      ? ORDEM_P3.map((e) => ({
          estagio: e,
          rotulo: ROTULO_ESTADO_ACOMPANHAMENTO[e],
        }))
      : ORDEM_P4.map((e) => ({ estagio: e, rotulo: ROTULO_ESTAGIO_P4[e] }));

  return (
    <>
      <CabecalhoTela
        titulo="Pipeline"
        lateral={
          <>
            <Botao
              asChild
              variante="fantasma"
              tamanho="compacto"
              iconeEsquerda={<Users aria-hidden="true" className="size-4" />}
            >
              <Link href="/pipeline/duplicatas">Duplicatas</Link>
            </Botao>
            {podeCadastrar && aba === 1 ? <FormularioLead /> : null}
          </>
        }
      />

      {/* Abas em pílula (DESIGN.md, 2.9): as duas etapas do funil. */}
      <AbasPilula
        rotulo="Pipelines"
        ativa={String(aba)}
        larga="celular"
        className="mt-1"
        abas={[
          {
            valor: "1",
            rotulo: "1 · Entrada e qualificação",
            href: "/pipeline?pipeline=1",
          },
          {
            valor: "2",
            rotulo: "2 · Venda e pré-atendimento",
            href: "/pipeline?pipeline=2",
          },
          {
            valor: "3",
            rotulo: "3 · Atendimento",
            href: "/pipeline?pipeline=3",
          },
          {
            valor: "4",
            rotulo: "4 · Pós-venda",
            href: "/pipeline?pipeline=4",
          },
        ]}
      />

      <div className="pt-2">
        {aba <= 2 ? (
          <FiltrosPipeline
            pipeline={pipeline}
            regioes={regioes}
            valores={{
              busca: filtro.busca,
              regiaoId: filtro.regiaoId,
              classificacao: filtro.classificacao,
              minhas: filtro.minhas,
              semanasMin: texto(pesquisa, "semanasMin"),
              semanasMax: texto(pesquisa, "semanasMax"),
            }}
          />
        ) : (
          <FiltrosSomenteLeitura
            pipeline={aba as 3 | 4}
            regioes={aba === 3 ? regioes : undefined}
            busca={filtro.busca}
            regiaoId={texto(pesquisa, "regiaoId")}
          />
        )}
      </div>

      <div className="pt-2">
        {falhou ? (
          <FaixaAlerta
            variante="erro"
            titulo="Não foi possível carregar o pipeline agora"
          >
            Confira a conexão e recarregue a página. Se continuar, avise a
            equipe técnica.
          </FaixaAlerta>
        ) : aba >= 3 ? (
          posVendaRestrito ? (
            <FaixaAlerta variante="info" titulo="Pós-venda é da coordenação">
              Esta aba aparece para a coordenação e a diretoria. Peça a elas o
              andamento das pesquisas.
            </FaixaAlerta>
          ) : (
            <>
              <QuadroSomenteLeitura
                key={aba}
                colunas={colunasLeitura}
                cartoes={leitura}
                nomeAba={aba === 3 ? "atendimento" : "pós-venda"}
              />
              <GraficosSomenteLeitura
                colunas={colunasLeitura}
                cartoes={leitura}
                comClassificacao={aba === 4}
              />
            </>
          )
        ) : (
          <>
            <QuadroPipeline
              pipeline={pipeline}
              cartoes={cartoes}
              papeis={sessao.papeis}
            />
            <GraficosPipeline cartoes={cartoes} pipeline={pipeline} />
            {pipeline === 1 ? (
              <>
                <Nota className="mt-4">
                  <b className="font-semibold">Nutrição não é arquivo morto.</b>{" "}
                  É o maior pipeline do sistema por volume e o principal motor
                  comercial. A régua acompanha a semana gestacional, não os dias
                  desde o cadastro, e se recalcula sozinha quando a DPP muda.
                </Nota>
              </>
            ) : null}
          </>
        )}
      </div>
    </>
  );
}
