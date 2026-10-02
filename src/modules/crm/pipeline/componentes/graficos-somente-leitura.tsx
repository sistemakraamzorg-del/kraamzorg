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
    <p className="text-apoio text-texto-2 py-6">Ainda sem dados suficientes.</p>
  );

  return (
    <div className="grid gap-4 pt-4 lg:grid-cols-2">
      <Cartao variante="areia-clara">
        <h2 className="font-titulo text-3 font-medium">Famílias por estágio</h2>
        <p className="text-apoio text-texto-2 mb-4">
          Onde cada família está agora.
        </p>
        {funil.length > 0 ? (
          <BarrasHorizontais
            rotulo="Famílias por estágio"
            larguraRotulo="9rem"
            itens={funil}
          />
        ) : (
          vazio
        )}
      </Cartao>
      {comClassificacao ? (
        <Cartao variante="dourado">
          <h2 className="font-titulo text-3 font-medium">
            Como as famílias avaliaram
          </h2>
          <p className="text-apoio text-texto-2 mb-4">
            Classificação das pesquisas já respondidas.
          </p>
          {respondidas > 0 ? (
            <Rosca
              rotulo="Famílias por classificação da pesquisa"
              fatias={fatias}
              centro={{ valor: String(respondidas), legenda: "respostas" }}
            />
          ) : (
            vazio
          )}
        </Cartao>
      ) : null}
    </div>
  );
}
