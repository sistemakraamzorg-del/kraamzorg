import { Card, CardBody, Kpi, Nota } from "@/components/mockup";
import { BarrasHorizontais } from "@/components/graficos";
import type {
  ListaParceiros,
  RelatorioIndicacoes,
} from "@/lib/dados/tipos-relacao";
import { CabecalhoGrafico } from "./faixa-resumo";

/**
 * Topo de Indicações no desenho do mockup (v-indicacoes): aviso da vedação
 * ética, quatro indicadores e os dois gráficos. Só o que o banco tem: não há
 * série mensal nem receita indicada, e os dois blocos dizem isso.
 */
export function FaixaIndicacoes({
  lista,
  relatorio,
}: {
  lista: ListaParceiros;
  relatorio: RelatorioIndicacoes | null;
}) {
  const medicos = relatorio?.porMedico ?? [];
  const familias = relatorio?.porPromotora ?? [];
  const soma = (xs: { indicacoes: number }[]) =>
    xs.reduce((t, x) => t + x.indicacoes, 0);
  const contratos = (xs: { contratos: number }[]) =>
    xs.reduce((t, x) => t + x.contratos, 0);
  const porMedica = soma(medicos);
  const porFamilia = soma(familias);
  const total = relatorio?.total ?? porMedica + porFamilia;
  const viraram = contratos(medicos) + contratos(familias);
  const conversao =
    total > 0
      ? `${((100 * viraram) / total).toFixed(1).replace(".", ",")}%`
      : null;
  const ativos = lista.parceiros.filter((p) => p.estado === "ativo");
  const obstetras = ativos.filter((p) => p.especialidade === "obstetra").length;
  const pediatras = ativos.filter((p) => p.especialidade === "pediatra").length;
  const qualificadas = medicos.reduce((t, m) => t + m.qualificadas, 0);
  const etapas = [
    { rotulo: "Indicações", valor: porMedica, cor: "bg-dourado-vivo" },
    { rotulo: "Qualificadas", valor: qualificadas, cor: "bg-azul-vivo" },
    {
      rotulo: "Contratos",
      valor: contratos(medicos),
      cor: "bg-sucesso-vivo",
    },
  ];
  const maior = Math.max(...etapas.map((e) => e.valor), 1);

  return (
    <>
      <Nota tom="alerta">
        <b>Parceria não tem contrapartida financeira</b>
        {lista.aviso ? ` ${lista.aviso}` : null}
      </Nota>
      <div className="tablet:grid-cols-2 grid grid-cols-1 gap-3.5 lg:grid-cols-4">
        <Kpi
          rotulo="Indicações recebidas"
          valor={total}
          delta="no relatório de indicações"
        />
        <Kpi
          rotulo="Viraram contrato"
          valor={viraram}
          delta={
            conversao ? `${conversao} de conversão` : "sem indicação ainda"
          }
          tomDelta={conversao ? "ok" : "neutro"}
        />
        <Kpi
          rotulo="Parceiros médicos ativos"
          valor={ativos.length}
          delta={`${obstetras} ${obstetras === 1 ? "obstetra" : "obstetras"} · ${pediatras} ${pediatras === 1 ? "pediatra" : "pediatras"}`}
        />
        <Kpi
          rotulo="Receita indicada"
          valor="sem dado"
          delta="o valor por origem ainda não é calculado aqui"
        />
      </div>
      <div className="grid grid-cols-1 gap-3.5 lg:grid-cols-2">
        <Card>
          <CardBody>
            <CabecalhoGrafico
              titulo="Funil da indicação médica"
              nota="relatório de indicações"
            />
            {porMedica === 0 ? (
              <p className="rounded-2 bg-areia-clara text-corpo text-texto-2 px-4 py-6">
                Quando você registrar uma indicação de um médico parceiro, o
                funil aparece aqui.
              </p>
            ) : (
              <ul className="flex flex-col gap-2.5">
                {etapas.map((e) => (
                  <li
                    key={e.rotulo}
                    className="grid grid-cols-[110px_1fr_auto] items-center gap-2.5 text-[12.5px]"
                  >
                    <span>{e.rotulo}</span>
                    <span
                      aria-hidden="true"
                      className="bg-areia-clara h-[18px] overflow-hidden rounded-[4px]"
                    >
                      <i
                        className={`${e.cor} block h-full`}
                        style={{ width: `${(100 * e.valor) / maior}%` }}
                      />
                    </span>
                    <b className="font-mono">{e.valor}</b>
                  </li>
                ))}
              </ul>
            )}
          </CardBody>
        </Card>
        <Card>
          <CardBody>
            <CabecalhoGrafico
              titulo="Indicação de cliente × médica"
              nota="total do relatório"
            />
            {porMedica + porFamilia === 0 ? (
              <p className="rounded-2 bg-areia-clara text-corpo text-texto-2 px-4 py-6">
                Quando as indicações chegarem, o volume por origem aparece aqui.
                A série mês a mês entra quando houver mais de um mês de
                histórico.
              </p>
            ) : (
              <BarrasHorizontais
                rotulo="Indicações por origem"
                larguraRotulo="7rem"
                itens={[
                  { rotulo: "Médica", valor: porMedica, tom: "dourado" },
                  { rotulo: "Cliente", valor: porFamilia, tom: "sucesso" },
                ]}
              />
            )}
          </CardBody>
        </Card>
      </div>
    </>
  );
}
