import { BarrasHorizontais, Colunas, Rosca } from "@/components/graficos";
import { Cartao } from "@/components/ui/cartao";
import type { NumeroPipeline } from "@/lib/dados/tipos";
import {
  ORDEM_P1,
  ORDEM_P2,
  ROTULO_MOTIVO_PERDA,
  rotuloEstagio,
} from "../estagios";
import { calcularIdadeGestacional, hojeBrasilia } from "../idade-gestacional";
import type { CartaoPipelineTela } from "../tipos";

/**
 * Faixas de semana do gráfico (só o recorte do eixo; não é regra de
 * negócio). A última faixa não tem teto.
 */
const FAIXAS: readonly { rotulo: string; de: number; ate: number }[] = [
  { rotulo: "Até 14", de: 0, ate: 14 },
  { rotulo: "15 a 20", de: 15, ate: 20 },
  { rotulo: "21 a 26", de: 21, ate: 26 },
  { rotulo: "27 a 32", de: 27, ate: 32 },
  { rotulo: "33 a 38", de: 33, ate: 38 },
  { rotulo: "39 ou mais", de: 39, ate: Infinity },
];

const SEM_DADOS = "Ainda sem dados suficientes";

function Vazio() {
  return <p className="text-apoio text-texto-2 py-6">{SEM_DADOS}.</p>;
}

/**
 * Gráficos de baixo do pipeline 1 (mockup da Camila), derivados só dos
 * cartões que a tela já carregou. Sem dado, estado vazio honesto.
 * "Viraram contrato" não entra: o pipeline 1 não traz esse vínculo.
 */
export function GraficosPipeline({
  cartoes,
  pipeline,
}: {
  cartoes: CartaoPipelineTela[];
  pipeline: NumeroPipeline;
}) {
  const hoje = hojeBrasilia();
  const contagem = FAIXAS.map(() => 0);
  for (const c of cartoes) {
    if (c.dataNascimento) continue;
    const ig = calcularIdadeGestacional(c.dpp, hoje);
    if (!ig) continue;
    const i = FAIXAS.findIndex(
      (f) => ig.semanas >= f.de && ig.semanas <= f.ate,
    );
    if (i >= 0) contagem[i] = (contagem[i] ?? 0) + 1;
  }
  const temSemanas = contagem.some((n) => n > 0);

  const perdas = new Map<string, number>();
  for (const c of cartoes) {
    if (c.motivoPerda)
      perdas.set(c.motivoPerda, (perdas.get(c.motivoPerda) ?? 0) + 1);
  }
  const motivos = [...perdas.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([motivo, valor]) => ({
      rotulo:
        ROTULO_MOTIVO_PERDA[motivo as keyof typeof ROTULO_MOTIVO_PERDA] ??
        motivo,
      valor,
      // Perda gestacional nunca em vermelho nem dourado: cor própria.
      tom:
        motivo === "perda_gestacional"
          ? ("sensivel" as const)
          : ("dourado" as const),
    }));

  const funil = (pipeline === 1 ? ORDEM_P1 : ORDEM_P2)
    .map((e) => ({
      rotulo: rotuloEstagio(pipeline, e),
      valor: cartoes.filter(
        (c) => (pipeline === 1 ? c.estagioP1 : c.estagioP2) === e,
      ).length,
      tom: "dourado" as const,
    }))
    .filter((f) => f.valor > 0);

  const porClasse = (k: string) =>
    cartoes.filter((c) => c.classificacao === k).length;
  const fatias = [
    { rotulo: "Quente", valor: porClasse("quente"), tom: "sucesso" as const },
    { rotulo: "Morno", valor: porClasse("morno"), tom: "aviso" as const },
    { rotulo: "Frio", valor: porClasse("frio"), tom: "areia" as const },
  ].filter((f) => f.valor > 0);
  const comPontuacao = fatias.reduce((a, f) => a + f.valor, 0);

  return (
    <div className="grid gap-3 pt-2 lg:grid-cols-2 xl:grid-cols-3">
      <Cartao variante="areia-clara">
        <h2 className="font-titulo text-3 font-medium">Famílias por estágio</h2>
        <p className="text-apoio text-texto-2 mb-2">
          Para onde o movimento está indo.
        </p>
        {funil.length > 0 ? (
          <BarrasHorizontais
            rotulo="Famílias por estágio"
            larguraRotulo="9rem"
            itens={funil}
          />
        ) : (
          <Vazio />
        )}
      </Cartao>
      <Cartao variante="dourado">
        <h2 className="font-titulo text-3 font-medium">
          Como estão as pontuações
        </h2>
        <p className="text-apoio text-texto-2 mb-2">
          Quantas famílias estão quentes, mornas e frias.
        </p>
        {comPontuacao > 0 ? (
          <Rosca
            rotulo="Famílias por classificação"
            fatias={fatias}
            centro={{ valor: String(comPontuacao), legenda: "famílias" }}
          />
        ) : (
          <Vazio />
        )}
      </Cartao>
      {pipeline === 1 ? (
        <>
          <Cartao>
            <h2 className="font-titulo text-3 font-medium">
              Famílias por semana gestacional
            </h2>
            <p className="text-apoio text-texto-2 mb-2">
              Onde a família está hoje, pela DPP.
            </p>
            {temSemanas ? (
              <Colunas
                rotulo="Famílias por faixa de semanas"
                altura={160}
                itens={FAIXAS.map((f, i) => ({
                  rotulo: f.rotulo,
                  valor: contagem[i] ?? 0,
                }))}
              />
            ) : (
              <Vazio />
            )}
          </Cartao>
          <Cartao>
            <h2 className="font-titulo text-3 font-medium">Motivos de perda</h2>
            <p className="text-apoio text-texto-2 mb-2">
              Das famílias que aparecem nesta lista.
            </p>
            {motivos.length > 0 ? (
              <BarrasHorizontais
                rotulo="Motivos de perda"
                larguraRotulo="9rem"
                itens={motivos}
              />
            ) : (
              <Vazio />
            )}
          </Cartao>
        </>
      ) : null}
    </div>
  );
}
