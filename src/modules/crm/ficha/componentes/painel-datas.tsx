import { Card, CardBody, CardHead, Nota } from "@/components/mockup";
import { Selo } from "@/components/ui/selo";
import { formatarData } from "@/lib/formatacao";
import type { FichaTela } from "../tipos";
import { emModoSensivel, linhaDaFicha } from "./meta-ficha";
import { ComSiglas } from "@/components/ui/siglas";

/**
 * "Datas que governam a operação" (`.kv` do mockup): as quatro datas, a DPP
 * como estimativa e as outras três como fato. A data que ainda não existe diz
 * "ainda não"; em perda ou intercorrência diz "sem registro", sem promessa de
 * futuro (DESIGN.md, 11.5 e 11.8). A linha da gestação, quando cabe, vem
 * logo abaixo (a semana sai de `ig(dpp, hoje)`, nunca gravada).
 */
export function PainelDatas({ ficha }: { ficha: FichaTela }) {
  const sensivel = emModoSensivel(ficha.estadoSensivel);
  const linha = linhaDaFicha(ficha);
  return (
    <Card>
      <CardHead titulo="Datas do acompanhamento" />
      <CardBody>
        <dl className="grid grid-cols-[96px_minmax(0,1fr)] gap-x-2.5 gap-y-[5px] text-[12.5px]">
          {ficha.datas.map((data) => (
            <div key={data.rotulo} className="contents">
              <dt className="text-tinta-50 text-[11.5px]">
                {data.rotulo === "Início" ? (
                  "Início efetivo"
                ) : (
                  <ComSiglas texto={data.rotulo} />
                )}
              </dt>
              <dd className="font-medium">
                {data.valor ? (
                  <>
                    <span className="font-mono tabular-nums">
                      {formatarData(data.valor) ?? data.valor}
                    </span>{" "}
                    {data.tipo === "estimativa" ? (
                      <span className="text-tinta-50 text-[11.5px] font-normal">
                        estimativa
                      </span>
                    ) : (
                      <Selo variante="sucesso" className="text-[9.5px]">
                        fato
                      </Selo>
                    )}
                  </>
                ) : (
                  <span className="text-tinta-50 text-[11.5px] font-normal">
                    {sensivel ? "sem registro" : "ainda não"}
                  </span>
                )}
              </dd>
            </div>
          ))}
        </dl>
        {linha ? <div className="mt-3 max-w-md">{linha}</div> : null}
        {sensivel ? null : (
          <Nota className="mt-3 text-[11.5px]">
            A DPP (data provável do parto) é só uma estimativa. Nascimento, alta
            e início entram quando acontecem. Nenhuma visita nem aviso é marcado
            pela DPP: o que vale é a alta.
          </Nota>
        )}
      </CardBody>
    </Card>
  );
}
