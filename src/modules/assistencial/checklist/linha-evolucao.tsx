import { Card, CardBody, CardHead } from "@/components/mockup";
import { cn } from "@/lib/utils";
import { textos } from "./textos";

/**
 * Linha de evolução da família (`.evo` do mockup): um quadrado por dia
 * contratado. Só o dia desta visita é conhecido aqui; os anteriores ficam
 * neutros e os seguintes tracejados, sem afirmar que foram ou não feitos.
 */
export function LinhaEvolucao({
  diaAtual,
  diasContratados,
}: {
  diaAtual: number;
  diasContratados: number;
}) {
  if (diasContratados < 1) return null;
  const dias = Array.from({ length: diasContratados }, (_, i) => i + 1);
  return (
    <Card>
      <CardHead
        titulo={textos.linhaEvolucao.titulo}
        direita={textos.diaDeTotal(diaAtual, diasContratados)}
      />
      <CardBody>
        <ol
          aria-label={textos.linhaEvolucao.titulo}
          className="flex gap-[5px] overflow-x-auto sm:flex-wrap"
        >
          {dias.map((d) => {
            const agora = d === diaAtual;
            return (
              <li
                key={d}
                aria-current={agora ? "step" : undefined}
                className={cn(
                  "min-h-11 min-w-[58px] flex-1 list-none rounded-[8px] border px-[7px] py-[9px] text-center",
                  agora && "border-marinho bg-marinho text-areia",
                  d < diaAtual &&
                    "border-linha bg-superficie text-dourado-texto",
                  d > diaAtual && "border-fio-2 text-tinta-30 border-dashed",
                )}
              >
                <div className="font-titulo text-[15px] font-normal">D{d}</div>
                {agora ? (
                  <div className="mt-0.5 text-[9.5px]">
                    {textos.linhaEvolucao.estaVisita}
                  </div>
                ) : null}
              </li>
            );
          })}
        </ol>
      </CardBody>
    </Card>
  );
}
