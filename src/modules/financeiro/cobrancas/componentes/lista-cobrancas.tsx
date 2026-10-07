import * as React from "react";
import Link from "next/link";
import { FolhaLupa } from "@/components/ilustracoes";
import { Kpi } from "@/components/mockup";
import { Botao } from "@/components/ui/botao";
import { EstadoVazio } from "@/components/ui/estado-vazio";
import { Selo } from "@/components/ui/selo";
import { TabelaLista } from "@/components/ui/tabela-lista";
import { hojeBrasilia } from "@/modules/crm/pipeline/idade-gestacional";
import type {
  LinhaCobranca,
  ListaCobrancas,
  SituacaoCobranca,
} from "@/lib/dados/tipos-contrato";
import { formatarData, formatarMoeda } from "@/lib/formatacao";
import { ROTULO_METODO, ROTULO_SITUACAO, VARIANTE_SITUACAO } from "../rotulos";
import { BarrasMock, HBarrasMock, RoscaMock } from "../../graficos-mock";
import {
  BlocoTabela,
  CartaoGrafico,
  ChipsNav,
  CLASSE_TABELA,
  Grade,
  SemDado,
} from "../../mockup-ui";
import { formatarMoedaCurta } from "@/lib/gestao/formato";

const FILTROS: { valor: SituacaoCobranca | undefined; rotulo: string }[] = [
  { valor: undefined, rotulo: "Todas" },
  { valor: "aberta", rotulo: "Em aberto" },
  { valor: "vencida", rotulo: "Vencidas" },
  { valor: "paga", rotulo: "Pagas" },
];

/** Faixas de atraso em dias, só para agrupar o gráfico de inadimplência. */
const FAIXAS_ATRASO = [
  { rotulo: "Até 7 dias", ate: 7 },
  { rotulo: "8 a 30 dias", ate: 30 },
  { rotulo: "Mais de 30 dias", ate: Infinity },
] as const;

const MAX_MESES = 6;

const diasEntre = (de: string, ate: string): number =>
  Math.round((Date.parse(ate) - Date.parse(de)) / 86_400_000);

/** Mês de vencimento (aaaa-mm) → "10/2026". */
const rotuloMes = (m: string) => `${m.slice(5, 7)}/${m.slice(0, 4)}`;

function GraficosCobrancas({ todas }: { todas: LinhaCobranca[] }) {
  const contaveis = todas.filter(
    (c) =>
      c.situacao === "aberta" ||
      c.situacao === "vencida" ||
      c.situacao === "paga",
  );
  if (contaveis.length === 0) return null;

  const por = (s: SituacaoCobranca) =>
    contaveis.filter((c) => c.situacao === s).length;

  // Valor por mês de vencimento: o que falta receber ao lado do que já entrou.
  const meses = new Map<string, { pendente: number; recebido: number }>();
  for (const c of contaveis) {
    const m = c.vencimento.slice(0, 7);
    const atual = meses.get(m) ?? { pendente: 0, recebido: 0 };
    if (c.situacao === "paga") {
      atual.recebido += c.valorPagoCentavos ?? c.valorCentavos;
    } else {
      atual.pendente += c.valorCentavos;
    }
    meses.set(m, atual);
  }
  const colunas = [...meses.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-MAX_MESES)
    .map(([m, v]) => ({
      rotulo: rotuloMes(m),
      pendente: v.pendente,
      recebido: v.recebido,
    }));

  // Inadimplência: valor vencido por faixa de dias de atraso.
  const hoje = hojeBrasilia();
  const vencidas = contaveis.filter((c) => c.situacao === "vencida");
  const faixas = FAIXAS_ATRASO.map((f, i) => {
    const antes = i === 0 ? 0 : FAIXAS_ATRASO[i - 1]!.ate;
    const doGrupo = vencidas.filter((c) => {
      const d = diasEntre(c.vencimento, hoje);
      return d > antes && d <= f.ate;
    });
    const centavos = doGrupo.reduce((a, c) => a + c.valorCentavos, 0);
    return { f, n: doGrupo.length, centavos };
  });
  const totalVencido = vencidas.reduce((a, c) => a + c.valorCentavos, 0);

  return (
    <>
      <Grade colunas={2}>
        <CartaoGrafico
          titulo="Cobranças por situação"
          nota="em aberto, vencidas e pagas"
        >
          <RoscaMock
            rotulo="Cobranças por situação"
            centro={String(contaveis.length)}
            sub="cobranças"
            fatias={[
              { rotulo: "Em aberto", valor: por("aberta"), tom: "aviso" },
              { rotulo: "Vencidas", valor: por("vencida"), tom: "alerta" },
              { rotulo: "Pagas", valor: por("paga"), tom: "sucesso" },
            ]}
          />
        </CartaoGrafico>

        <CartaoGrafico
          titulo="Atraso das vencidas"
          nota={
            vencidas.length === 0
              ? "nenhuma agora"
              : `${formatarMoeda(totalVencido)} em ${plural(vencidas.length, "cobrança vencida", "cobranças vencidas")}`
          }
        >
          {vencidas.length === 0 ? (
            <SemDado>
              Nenhuma cobrança vencida agora. Quando uma passar do prazo, ela
              aparece aqui por dias de atraso.
            </SemDado>
          ) : (
            <HBarrasMock
              rotulo="Valor vencido por faixa de atraso"
              rotuloLargura={104}
              direita={78}
              linhas={faixas.map(({ f, centavos }) => ({
                rotulo: f.rotulo,
                valor: centavos,
                tom: "alerta",
                nota: formatarMoedaCurta(centavos),
              }))}
            />
          )}
        </CartaoGrafico>
      </Grade>

      <CartaoGrafico
        titulo="A receber e recebido"
        nota="por mês de vencimento, em reais"
      >
        <BarrasMock
          altura={190}
          formato="moeda"
          rotulo="Valor a receber e recebido por mês de vencimento, em reais"
          rotulos={colunas.map((c) => c.rotulo)}
          series={[
            {
              nome: "A receber",
              tom: "aviso",
              valores: colunas.map((c) => c.pendente),
            },
            {
              nome: "Recebido",
              tom: "sucesso",
              valores: colunas.map((c) => c.recebido),
            },
          ]}
        />
      </CartaoGrafico>
    </>
  );
}

function plural(n: number, um: string, varios: string): string {
  return `${n} ${n === 1 ? um : varios}`;
}

/** Frase do resumo: número em frase, com comparação e sem painel de números soltos (voz.md, 5). */
export function fraseResumo(resumo: ListaCobrancas["resumo"]): string {
  const partes: string[] = [];
  const emAberto = resumo.abertas + resumo.vencidas;
  if (emAberto === 0) {
    partes.push("Nenhuma cobrança espera pagamento agora.");
  } else {
    partes.push(
      `${plural(emAberto, "cobrança espera", "cobranças esperam")} pagamento, somando ${formatarMoeda(resumo.aReceberCentavos)}.`,
    );
    if (resumo.vencidas > 0) {
      partes.push(`${plural(resumo.vencidas, "já venceu", "já venceram")}.`);
    }
  }
  if (resumo.pagas > 0) {
    partes.push(
      `${plural(resumo.pagas, "paga", "pagas")}, ${formatarMoeda(resumo.recebidoCentavos)} recebidos.`,
    );
  }
  return partes.join(" ");
}

function contagemDoFiltro(
  resumo: ListaCobrancas["resumo"],
  valor: SituacaoCobranca | undefined,
): number {
  if (valor === "aberta") return resumo.abertas;
  if (valor === "vencida") return resumo.vencidas;
  if (valor === "paga") return resumo.pagas;
  return resumo.abertas + resumo.vencidas + resumo.pagas;
}

export function ListaCobrancasTela({
  lista,
  todas,
  situacao,
}: {
  lista: ListaCobrancas;
  todas: LinhaCobranca[];
  situacao: SituacaoCobranca | undefined;
}) {
  const emAberto = lista.resumo.abertas + lista.resumo.vencidas;
  return (
    <div className="flex flex-col gap-3.5">
      <p className="text-tinta-70 max-w-[64ch] text-[13px] leading-[1.6]">
        {fraseResumo(lista.resumo)}
      </p>

      <Grade colunas={2} data-tour="/cobrancas:totais">
        <Kpi
          rotulo="A receber"
          valor={formatarMoeda(lista.resumo.aReceberCentavos)}
          delta={
            emAberto === 0
              ? "Nenhuma cobrança em aberto."
              : `${plural(emAberto, "cobrança em aberto", "cobranças em aberto")}${lista.resumo.vencidas > 0 ? `, ${plural(lista.resumo.vencidas, "vencida", "vencidas")}` : ""}.`
          }
        />
        <Kpi
          rotulo="Recebido"
          valor={formatarMoeda(lista.resumo.recebidoCentavos)}
          delta={
            lista.resumo.pagas === 0
              ? "Nenhuma paga ainda."
              : `${plural(lista.resumo.pagas, "cobrança paga", "cobranças pagas")}.`
          }
          tomDelta={lista.resumo.pagas === 0 ? "neutro" : "ok"}
        />
      </Grade>

      <GraficosCobrancas todas={todas} />

      <ChipsNav
        rotulo="Filtrar cobranças"
        idTour="/cobrancas:filtros"
        itens={FILTROS.map((f) => ({
          rotulo: f.rotulo,
          href: f.valor ? `/cobrancas?situacao=${f.valor}` : "/cobrancas",
          ativo: f.valor === situacao,
          contagem: contagemDoFiltro(lista.resumo, f.valor),
        }))}
      />

      {lista.cobrancas.length === 0 ? (
        <EstadoVazio
          nivelTitulo="h2"
          ilustracao={<FolhaLupa tamanho={104} />}
          titulo="Nenhuma cobrança neste filtro"
          texto="As cobranças nascem quando o contrato é assinado. Quando houver uma, ela aparece aqui com o link de pagamento e a situação."
        />
      ) : (
        <BlocoTabela
          titulo="Cobranças"
          idTour="/cobrancas:tabela"
          direita={plural(lista.cobrancas.length, "cobrança", "cobranças")}
        >
          <TabelaLista
            className={CLASSE_TABELA}
            rotulo="Cobranças"
            colunas={[
              { chave: "familia", rotulo: "Família", principal: true },
              { chave: "situacao", rotulo: "Situação", canto: true },
              { chave: "valor", rotulo: "Valor", numerica: true },
              { chave: "vencimento", rotulo: "Vencimento" },
              { chave: "pagamento", rotulo: "Pagamento" },
              { chave: "acao", rotulo: "Ação" },
            ]}
            linhas={lista.cobrancas.map((c) => ({
              id: c.id,
              valores: {
                acao: (
                  <Botao asChild variante="secundario" tamanho="compacto">
                    <Link href={`/cobrancas/${c.id}`}>
                      {c.situacao === "paga" ? "Ver recibo" : "Abrir cobrança"}
                    </Link>
                  </Botao>
                ),
                familia: (
                  <Link
                    href={`/cobrancas/${c.id}`}
                    className="text-texto font-semibold underline decoration-1 underline-offset-4"
                  >
                    {c.familiaNome}
                  </Link>
                ),
                situacao: (
                  <Selo variante={VARIANTE_SITUACAO[c.situacao]}>
                    {ROTULO_SITUACAO[c.situacao]}
                  </Selo>
                ),
                valor: formatarMoeda(c.valorCentavos),
                vencimento: formatarData(c.vencimento) ?? c.vencimento,
                pagamento:
                  c.situacao === "paga"
                    ? [
                        c.pagoEm ? formatarData(c.pagoEm) : null,
                        c.metodo ? (ROTULO_METODO[c.metodo] ?? c.metodo) : null,
                      ]
                        .filter(Boolean)
                        .join(", ")
                    : c.temLink
                      ? "Link gerado"
                      : "Sem link ainda",
              },
            }))}
          />
        </BlocoTabela>
      )}
    </div>
  );
}
