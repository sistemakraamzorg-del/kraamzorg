import * as React from "react";
import Link from "next/link";
import { CircleCheck, Hourglass } from "lucide-react";
import { FiltroPilula } from "@/components/blocos/filtro-pilula";
import { FolhaLupa } from "@/components/ilustracoes";
import { BarrasHorizontais, Colunas, Rosca } from "@/components/graficos";
import { Botao } from "@/components/ui/botao";
import { CartaoResumo } from "@/components/ui/cartao-resumo";
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

function Cartao({
  titulo,
  legenda,
  children,
}: {
  titulo: string;
  legenda?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-3 bg-superficie border-linha flex flex-col gap-4 border p-5">
      <div className="flex flex-col gap-1">
        <h2 className="font-titulo text-2 text-texto font-medium">{titulo}</h2>
        {legenda ? <p className="text-apoio text-texto-2">{legenda}</p> : null}
      </div>
      {children}
    </section>
  );
}

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
      valor: Math.round(v.pendente / 100),
      valor2: Math.round(v.recebido / 100),
      dica: `${rotuloMes(m)}: ${formatarMoeda(v.pendente)} a receber e ${formatarMoeda(v.recebido)} recebidos`,
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
    <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
      <Cartao
        titulo="Cobranças por situação"
        legenda="Quantas esperam pagamento, quantas venceram e quantas já foram pagas."
      >
        <Rosca
          rotulo="Cobranças por situação"
          centro={{ valor: String(contaveis.length), legenda: "cobranças" }}
          fatias={[
            { rotulo: "Em aberto", valor: por("aberta"), tom: "aviso" },
            { rotulo: "Vencidas", valor: por("vencida"), tom: "alerta" },
            { rotulo: "Pagas", valor: por("paga"), tom: "sucesso" },
          ]}
        />
      </Cartao>

      <Cartao
        titulo="Atraso das vencidas"
        legenda={
          vencidas.length === 0
            ? "Nenhuma cobrança vencida agora. Quando uma passar do prazo, ela aparece aqui por dias de atraso."
            : `${formatarMoeda(totalVencido)} em ${plural(vencidas.length, "cobrança vencida", "cobranças vencidas")}, por dias de atraso.`
        }
      >
        {vencidas.length === 0 ? null : (
          <BarrasHorizontais
            rotulo="Valor vencido por faixa de atraso"
            larguraRotulo="8rem"
            itens={faixas.map(({ f, n, centavos }) => ({
              rotulo: f.rotulo,
              valor: centavos,
              tom: "alerta",
              nota: String(n),
              dica: `${f.rotulo}: ${formatarMoeda(centavos)} em ${plural(n, "cobrança", "cobranças")}`,
            }))}
          />
        )}
      </Cartao>

      <div className="lg:col-span-2">
        <Cartao
          titulo="A receber e recebido, por mês de vencimento"
          legenda="Valores em reais. Âmbar é o que falta receber, verde é o que já entrou."
        >
          <Colunas
            rotulo="Valor a receber e recebido por mês"
            itens={colunas}
            tom="aviso"
            tom2="sucesso"
          />
          <p className="text-apoio text-texto-2 flex flex-wrap gap-x-4 gap-y-1">
            <span className="flex items-center gap-2">
              <span
                aria-hidden="true"
                className="bg-aviso rounded-pilula size-2.5"
              />
              A receber
            </span>
            <span className="flex items-center gap-2">
              <span
                aria-hidden="true"
                className="bg-sucesso rounded-pilula size-2.5"
              />
              Recebido
            </span>
          </p>
        </Cartao>
      </div>
    </div>
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
  return (
    <div className="flex flex-col gap-6">
      <p className="text-3 text-texto max-w-[60ch]">
        {fraseResumo(lista.resumo)}
      </p>

      {/* Os dois números do caixa (DESIGN.md, 2.6): o que falta receber é
          o agora (dourado), o que já entrou é o feito (sálvia). O valor em
          Jost, grande, com a contagem em frase embaixo. */}
      <div className="tablet:grid-cols-2 grid grid-cols-1 gap-2 lg:max-w-[720px] lg:gap-3">
        <CartaoResumo
          tom="dourado"
          arranjo="linha"
          icone={<Hourglass />}
          valor={formatarMoeda(lista.resumo.aReceberCentavos)}
          rotulo="a receber"
          contexto={
            lista.resumo.abertas + lista.resumo.vencidas === 0
              ? "nenhuma cobrança em aberto"
              : `${plural(lista.resumo.abertas + lista.resumo.vencidas, "cobrança em aberto", "cobranças em aberto")}${lista.resumo.vencidas > 0 ? `, ${plural(lista.resumo.vencidas, "vencida", "vencidas")}` : ""}`
          }
        />
        <CartaoResumo
          tom="salvia"
          arranjo="linha"
          icone={<CircleCheck />}
          valor={formatarMoeda(lista.resumo.recebidoCentavos)}
          rotulo="recebido"
          contexto={
            lista.resumo.pagas === 0
              ? "nenhuma paga ainda"
              : plural(lista.resumo.pagas, "cobrança paga", "cobranças pagas")
          }
        />
      </div>

      <GraficosCobrancas todas={todas} />

      <FiltroPilula
        rotulo="Filtrar cobranças"
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
        <div className="min-[720px]:rounded-3 min-[720px]:bg-superficie min-[720px]:shadow-1 min-[720px]:p-2 lg:px-4 lg:py-3">
          <TabelaLista
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
        </div>
      )}
    </div>
  );
}
