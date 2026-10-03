import { BarrasHorizontais, Rosca } from "@/components/graficos";
import { Cartao } from "@/components/ui/cartao";
import type { CartaoSomenteLeitura } from "../somente-leitura";

/**
 * Gráficos de baixo das abas 3 e 4. O funil por estágio vale nas duas; a
 * rosca de classificação só existe no pós-venda, único com esse dado.
 */
export function GraficosSomenteLeitura({
  colunas,
  cartoes,
  comClassificacao,
}: {
  colunas: readonly { estagio: string; rotulo: string }[];
  cartoes: CartaoSomenteLeitura[];
  comClassificacao: boolean;
}) {
  const funil = colunas
    .map((c) => ({
      rotulo: c.rotulo,
      valor: cartoes.filter((x) => x.estagio === c.estagio).length,
      tom: "dourado" as const,
    }))
    .filter((f) => f.valor > 0);
  const por = (k: string) =>
    cartoes.filter((c) => c.classificacao === k).length;
  const fatias = [
    { rotulo: "Promotor", valor: por("promotor"), tom: "sucesso" as const },
    { rotulo: "Neutro", valor: por("neutro"), tom: "areia" as const },
    { rotulo: "Detrator", valor: por("detrator"), tom: "aviso" as const },
  ].filter((f) => f.valor > 0);
  const respondidas = fatias.reduce((a, f) => a + f.valor, 0);
  const vazio = (
    <p className="text-apoio text-texto-2 py-4">Ainda sem dados suficientes.</p>
  );

  return (
    <div className="grid gap-2 pt-2 md:grid-cols-2">
      <Cartao variante="areia-clara" className="p-3">
        <h2 className="font-titulo text-3 lg:text-apoio font-medium lg:font-semibold">
          Famílias por estágio
        </h2>
        <p className="text-apoio lg:text-mini text-texto-2 mb-2 lg:mb-1">
          Onde cada família está agora.
        </p>
        {funil.length > 0 ? (
          <div className="lg:max-h-[8.5rem] lg:overflow-y-auto">
            <BarrasHorizontais
              rotulo="Famílias por estágio"
              larguraRotulo="7rem"
              itens={funil}
            />
          </div>
        ) : (
          vazio
        )}
      </Cartao>
      {comClassificacao ? (
        <Cartao variante="dourado" className="p-3">
          <h2 className="font-titulo text-3 lg:text-apoio font-medium lg:font-semibold">
            Como as famílias avaliaram
          </h2>
          <p className="text-apoio lg:text-mini text-texto-2 mb-2 lg:mb-1">
            Classificação das pesquisas já respondidas.
          </p>
          {respondidas > 0 ? (
            <div className="lg:max-h-[8.5rem] lg:overflow-y-auto lg:[&_svg]:size-24">
              <Rosca
                rotulo="Famílias por classificação da pesquisa"
                fatias={fatias}
                centro={{ valor: String(respondidas), legenda: "respostas" }}
              />
            </div>
          ) : (
            vazio
          )}
        </Cartao>
      ) : null}
    </div>
  );
}
