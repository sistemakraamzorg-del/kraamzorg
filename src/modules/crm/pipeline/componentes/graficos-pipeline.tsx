import { Card, CardBody } from "@/components/mockup";
import type { NumeroPipeline } from "@/lib/dados/tipos";
import { ROTULO_MOTIVO_PERDA } from "../estagios";
import { calcularIdadeGestacional, hojeBrasilia } from "../idade-gestacional";
import type { CartaoPipelineTela } from "../tipos";
import {
  BarrasHorizontaisMockup,
  BarrasMockup,
  CabecalhoGrafico,
} from "./grafico-mockup";

/**
 * Faixas de semana do gráfico do mockup (só o recorte do eixo; não é regra
 * de negócio). "Já nasceu" vem da data de nascimento, não da DPP.
 */
const FAIXAS: readonly { rotulo: string; ate: number }[] = [
  { rotulo: "8-14", ate: 14 },
  { rotulo: "15-20", ate: 20 },
  { rotulo: "21-26", ate: 26 },
  { rotulo: "27-32", ate: 32 },
  { rotulo: "33-36", ate: 36 },
  { rotulo: "37+", ate: Infinity },
];

/** Cores das barras de motivo (tokens). Perda gestacional é sempre ameixa. */
const CORES_MOTIVO = [
  "var(--tinta-30)",
  "var(--alerta)",
  "var(--aviso)",
  "var(--dourado-2)",
  "var(--marinho-3)",
];

function Vazio({ texto }: { texto: string }) {
  return <p className="text-tinta-50 py-4 text-[12.5px]">{texto}</p>;
}

/**
 * Gráficos de baixo do pipeline (mockup da Camila), derivados só dos
 * cartões que a tela já carregou. Sem dado, estado vazio honesto.
 * "Viraram contrato" e as medidas de tempo parado e contratos por mês não
 * existem nos cartões: o bloco fica no lugar, com aviso.
 */
export function GraficosPipeline({
  cartoes,
  pipeline,
}: {
  cartoes: CartaoPipelineTela[];
  pipeline: NumeroPipeline;
}) {
  if (pipeline === 2) {
    return (
      <div className="mt-4 grid gap-[14px] md:grid-cols-2">
        <Card>
          <CardBody>
            <CabecalhoGrafico
              titulo="Tempo médio parado por etapa"
              legenda="dias, onde a receita trava"
            />
            <Vazio texto="Ainda sem dados suficientes. O tempo parado por etapa aparece quando o histórico de movimentos estiver disponível aqui." />
          </CardBody>
        </Card>
        <Card>
          <CardBody>
            <CabecalhoGrafico
              titulo="Contratos por mês"
              legenda="assinados e valor"
            />
            <Vazio texto="Ainda sem dados suficientes. Os contratos assinados por mês ficam no painel financeiro." />
          </CardBody>
        </Card>
      </div>
    );
  }

  const hoje = hojeBrasilia();
  const contagem = [...FAIXAS.map(() => 0), 0];
  for (const c of cartoes) {
    if (c.dataNascimento) {
      contagem[FAIXAS.length] = (contagem[FAIXAS.length] ?? 0) + 1;
      continue;
    }
    const ig = calcularIdadeGestacional(c.dpp, hoje);
    if (!ig) continue;
    const i = FAIXAS.findIndex((f) => ig.semanas <= f.ate);
    if (i >= 0) contagem[i] = (contagem[i] ?? 0) + 1;
  }
  const semanas = [...FAIXAS.map((f) => f.rotulo), "nasceu"].map(
    (rotulo, i) => ({
      rotulo,
      valor: contagem[i] ?? 0,
    }),
  );
  const temSemanas = semanas.some((s) => s.valor > 0);

  const perdas = new Map<string, number>();
  for (const c of cartoes) {
    if (c.motivoPerda)
      perdas.set(c.motivoPerda, (perdas.get(c.motivoPerda) ?? 0) + 1);
  }
  let n = 0;
  const motivos = [...perdas.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([motivo, valor]) => ({
      rotulo:
        ROTULO_MOTIVO_PERDA[motivo as keyof typeof ROTULO_MOTIVO_PERDA] ??
        motivo,
      valor,
      cor:
        motivo === "perda_gestacional"
          ? "var(--sensivel)"
          : (CORES_MOTIVO[n++ % CORES_MOTIVO.length] ?? "var(--dourado-2)"),
    }));

  return (
    <div className="mt-4 grid gap-[14px] md:grid-cols-2">
      <Card>
        <CardBody>
          <CabecalhoGrafico
            titulo="Leads por semana gestacional de entrada"
            legenda="pela DPP, na lista acima"
          />
          {temSemanas ? (
            <BarrasMockup
              dados={semanas}
              cor="var(--dourado-2)"
              descricao="Famílias por faixa de semanas gestacionais"
            />
          ) : (
            <Vazio texto="Ainda sem dados suficientes." />
          )}
        </CardBody>
      </Card>
      <Card>
        <CardBody>
          <CabecalhoGrafico
            titulo="Motivos de perda"
            legenda="das famílias desta lista"
          />
          {motivos.length > 0 ? (
            <BarrasHorizontaisMockup
              dados={motivos}
              descricao="Famílias por motivo de perda"
            />
          ) : (
            <Vazio texto="Ainda sem dados suficientes." />
          )}
        </CardBody>
      </Card>
    </div>
  );
}
