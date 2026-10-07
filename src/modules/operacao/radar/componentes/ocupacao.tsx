import Link from "next/link";
import {
  Barra,
  Card,
  CardBody,
  CardHead,
  Eyebrow,
  Nota,
} from "@/components/mockup";
import { Botao } from "@/components/ui/botao";
import type { OcupacaoSemana, Radar } from "@/lib/dados/tipos-operacao";
import { formatarData } from "@/lib/formatacao";
import { ocupacaoPorPraca } from "../agrupar";

const PCT = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 0 });
const curta = (iso: string) => formatarData(iso)?.slice(0, 5) ?? iso;

function tomDaSemana(o: OcupacaoSemana): "sucesso" | "aviso" | "alerta" {
  if (o.ocupacaoPct >= 100) return "alerta";
  return o.acimaDoLimite ? "aviso" : "sucesso";
}

/**
 * Capacidade projetada (mockup `v-radar`, bloco da esquerda): por praça, uma
 * barra por semana com a ocupação. O número vem da view `ocupacao_projetada`;
 * o limite de alerta vem do parâmetro. Verde dentro do esperado, âmbar acima
 * do limite, vermelho no máximo ou acima. A cor sempre vem com o número.
 */
export function CapacidadeProjetada({
  ocupacao,
  limitePct,
}: {
  ocupacao: OcupacaoSemana[];
  limitePct: number | null;
}) {
  const pracas = ocupacaoPorPraca(ocupacao);
  const sobrevenda = ocupacao.some((o) => o.ocupacaoPct >= 100);
  return (
    <Card>
      <CardHead
        titulo="Capacidade projetada"
        direita="famílias da semana ÷ limite da praça"
      />
      <CardBody>
        {pracas.length === 0 ? (
          <p className="text-tinta-50 text-[12.5px]">
            Nenhuma praça com limite cadastrado ainda. A capacidade aparece aqui
            quando a região tiver o limite de famílias por semana em
            Configurações.
          </p>
        ) : (
          <div
            className={
              pracas.length > 1
                ? "grid grid-cols-1 gap-[18px] md:grid-cols-2"
                : "grid grid-cols-1 gap-[18px]"
            }
          >
            {pracas.map((p) => (
              <div key={p.regiaoId}>
                <Eyebrow className="mb-2.5 block">{p.regiao}</Eyebrow>
                <ul className="flex flex-col gap-3">
                  {p.semanas.map((s) => (
                    <li key={s.semana}>
                      <div className="mb-1 flex justify-between text-xs">
                        <span>
                          {`Semana de ${curta(s.semana)} · ${s.familias === 1 ? "1 família" : `${s.familias} famílias`}`}
                        </span>
                        <b>{PCT.format(s.ocupacaoPct)}%</b>
                      </div>
                      <Barra
                        valor={s.ocupacaoPct}
                        tom={tomDaSemana(s)}
                        rotulo={`${p.regiao}, semana de ${curta(s.semana)}, ocupação de ${PCT.format(s.ocupacaoPct)}%`}
                      />
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}
        {limitePct !== null ? (
          <p className="text-tinta-50 mt-3.5 text-[11.5px]">
            {`Âmbar acima de ${PCT.format(limitePct)}%, vermelho em 100% ou mais.`}
          </p>
        ) : null}
        {sobrevenda ? (
          <Nota tom="alerta" className="mt-3.5 text-[11.5px]">
            Há semana com a praça no máximo ou acima. Antes de vender para essa
            janela, confira a capacidade.
          </Nota>
        ) : null}
      </CardBody>
    </Card>
  );
}

/** Cascata de reagendamento (mockup, bloco da direita): leva à agenda, onde o conflito aparece e a coordenação decide. */
export function CascataDoRadar() {
  return (
    <Card className="mb-3.5">
      <CardHead titulo="Cascata de reagendamento" />
      <CardBody>
        <p className="mb-3 text-[11.5px] leading-[1.6]">
          Quando um bebê nasce antes ou depois da data provável, as visitas
          marcadas podem esbarrar em outras. A agenda mostra cada conflito e o
          caminho para reagendar. O sistema propõe, a coordenação decide.
        </p>
        <Botao asChild variante="secundario" tamanho="compacto">
          <Link href="/agenda">Ver conflitos na agenda</Link>
        </Botao>
      </CardBody>
    </Card>
  );
}

/** Detecção proativa (mockup, bloco da direita): só o que é parâmetro real; a DPP nunca dispara ação. */
export function DeteccaoProativa({ radar }: { radar: Radar }) {
  const linha = (a: string, b: string, ultima = false) => (
    <div
      className={
        ultima
          ? "border-fio-3 flex justify-between gap-3 border-t"
          : "flex justify-between gap-3"
      }
    >
      <span>{a}</span>
      <b className="text-right">{b}</b>
    </div>
  );
  return (
    <Card>
      <CardHead titulo="O que o radar vigia" />
      <CardBody className="px-4 py-3">
        <div className="text-[11.5px] leading-[1.9]">
          {linha(
            "Período provável do parto",
            `${radar.janela.antes} dias antes a ${radar.janela.depois} depois`,
          )}
          {linha(
            "Limite de alerta da praça",
            radar.limiteAlertaPct !== null
              ? `${PCT.format(radar.limiteAlertaPct)}% da capacidade`
              : "não configurado",
            true,
          )}
          {linha("Após o nascimento", "Pede a previsão de alta", true)}
        </div>
        <p className="text-tinta-50 mt-2 text-[11.5px] leading-[1.6]">
          A data provável é estimativa: ela posiciona a barra e ordena a lista,
          e nunca dispara uma ação sozinha.
        </p>
      </CardBody>
    </Card>
  );
}
