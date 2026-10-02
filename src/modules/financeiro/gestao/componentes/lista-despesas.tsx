import Link from "next/link";
import { MantaDobrada } from "@/components/ilustracoes";
import { EstadoVazio } from "@/components/ui/estado-vazio";
import {
  GradeIndicadores,
  PainelGrafico,
} from "@/modules/inicio/painel-gestao";
import { Selo } from "@/components/ui/selo";
import { TabelaLista } from "@/components/ui/tabela-lista";
import type { ListaDespesas } from "@/lib/dados/tipos-gestao";
import { formatarData, formatarMoeda } from "@/lib/formatacao";
import { mesParaBusca, rotuloMes } from "@/lib/gestao/formato";
import { plural, ROTULO_CATEGORIA, ROTULO_ORIGEM } from "../textos";
import { RemoverDespesa } from "./remover-despesa";
import { Rosca } from "@/components/graficos";
import { fatiasDeDespesa } from "../fatias-despesa";

/** Frase de abertura da tela de despesas. */
export function fraseDespesas(l: ListaDespesas): string {
  if (l.despesas.length === 0) {
    return `Nenhuma despesa lançada em ${rotuloMes(l.mes)}.`;
  }
  return `${plural(l.despesas.length, "despesa lançada", "despesas lançadas")} em ${rotuloMes(l.mes)}, somando ${formatarMoeda(l.totalCentavos)}.`;
}

/**
 * Despesas do mês (P46 item 1), com corrigir e remover. A que nasceu do
 * pagamento da equipe aparece com o selo e sem ação: ela sai do DRE só se o
 * pagamento sair.
 */
export function ListaDespesasTela({ lista }: { lista: ListaDespesas }) {
  if (lista.despesas.length === 0) {
    return (
      <EstadoVazio
        nivelTitulo="h2"
        ilustracao={<MantaDobrada tamanho={104} />}
        titulo="Nenhuma despesa neste mês"
        texto="Lance a primeira no formulário acima. O pagamento da equipe entra sozinho quando é registrado, na tela de pagamento da equipe."
      />
    );
  }
  const porCategoria = new Map<string, number>();
  for (const d of lista.despesas) {
    const nome = ROTULO_CATEGORIA[d.categoria];
    porCategoria.set(nome, (porCategoria.get(nome) ?? 0) + d.valorCentavos);
  }
  const fatias = fatiasDeDespesa(
    [...porCategoria].map(([rotulo, centavos]) => ({ rotulo, centavos })),
  );
  const maior = [...porCategoria].sort((a, b) => b[1] - a[1])[0]!;
  const pctMaior = Math.round(
    (maior[1] / Math.max(lista.totalCentavos, 1)) * 100,
  );
  return (
    <>
      <div className="[&>ul]:mt-0">
        <GradeIndicadores
          itens={[
            {
              rotulo: "Total do mês",
              valor: formatarMoeda(lista.totalCentavos),
              contexto: `${plural(lista.despesas.length, "despesa lançada", "despesas lançadas")} em ${rotuloMes(lista.mes)}.`,
              href: "#desp-lista",
              tom: "areia",
            },
            {
              rotulo: "Maior categoria",
              valor: formatarMoeda(maior[1]),
              contexto: `${maior[0]}, ${pctMaior}% do total do mês.`,
              href: "#desp-comp",
              tom: "areia",
            },
          ]}
        />
      </div>
      <div id="desp-comp" className="scroll-mt-24">
        <PainelGrafico
          titulo="Como as despesas se dividem"
          nota={`Despesas de ${rotuloMes(lista.mes)} por categoria.`}
        >
          <Rosca
            formato="moeda"
            espessura={44}
            centro={{ valor: "", legenda: "" }}
            rotulo={`Despesas de ${rotuloMes(lista.mes)} por categoria`}
            fatias={fatias}
          />
        </PainelGrafico>
      </div>
      <div id="desp-lista" className="scroll-mt-24">
        <PainelGrafico
          titulo={`Lançadas em ${rotuloMes(lista.mes)}`}
          nota={plural(lista.despesas.length, "despesa", "despesas")}
        >
          <TabelaLista
            className="[&_thead_th]:bg-areia-clara"
            rotulo={`Despesas de ${rotuloMes(lista.mes)}`}
            colunas={[
              { chave: "descricao", rotulo: "O que foi pago", principal: true },
              { chave: "categoria", rotulo: "Categoria", canto: true },
              { chave: "data", rotulo: "Dia" },
              { chave: "valor", rotulo: "Valor", numerica: true },
              { chave: "acoes", rotulo: "Ações" },
            ]}
            linhas={lista.despesas.map((d) => ({
              id: d.id,
              valores: {
                descricao: (
                  <span>
                    {d.descricao}
                    {d.fornecedor ? (
                      <span className="text-texto-2 text-mini block">
                        {d.fornecedor}
                      </span>
                    ) : null}
                    {d.canal ? (
                      <span className="text-texto-2 text-mini block">
                        Canal: {ROTULO_ORIGEM[d.canal]}
                      </span>
                    ) : null}
                  </span>
                ),
                categoria: (
                  <Selo variante={d.daEquipe ? "marinho" : "neutro"}>
                    {ROTULO_CATEGORIA[d.categoria]}
                  </Selo>
                ),
                data: formatarData(d.data) ?? d.data,
                valor: formatarMoeda(d.valorCentavos),
                acoes: d.daEquipe ? (
                  <span className="text-mini text-texto-2">
                    Vem do pagamento da equipe
                  </span>
                ) : (
                  <span className="flex flex-wrap items-center gap-x-4">
                    <Link
                      href={`/financeiro/despesas?mes=${mesParaBusca(lista.mes)}&editar=${d.id}`}
                      className="text-apoio text-texto min-h-toque inline-flex items-center font-semibold underline decoration-1 underline-offset-4"
                      aria-label={`Corrigir a despesa ${d.descricao}`}
                    >
                      Corrigir
                    </Link>
                    <RemoverDespesa despesaId={d.id} descricao={d.descricao} />
                  </span>
                ),
              },
            }))}
          />
        </PainelGrafico>
      </div>
    </>
  );
}
