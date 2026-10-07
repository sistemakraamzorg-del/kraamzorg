import { BarrasHorizontais } from "@/components/graficos/barras-horizontais";
import { VerComoTabela } from "@/components/graficos/ver-como-tabela";
import {
  Barra,
  Card,
  CardBody,
  CardHead,
  Eyebrow,
  Nota,
} from "@/components/mockup";
import { Broto } from "@/components/ilustracoes";
import { EstadoVazio } from "@/components/ui/estado-vazio";
import { Selo } from "@/components/ui/selo";
import type {
  CapacidadeVisao,
  NivelCapacidade,
} from "@/lib/dados/tipos-gestao";
import { formatarDecimal, formatarPct, dataCurta } from "@/lib/gestao/formato";
import {
  ROTULO_COBERTURA,
  ROTULO_NIVEL,
  faixaDaSemana,
  faixasDaDistribuicao,
  notaDaDistribuicao,
  textoDoAlerta,
  tituloDoAlerta,
} from "../textos";

const VARIANTE_SELO: Record<NivelCapacidade, "neutro" | "aviso" | "alerta"> = {
  folga: "neutro",
  atencao: "aviso",
  sobrevenda: "alerta",
};

/**
 * Capacidade das próximas semanas (P45, PRD 10.2): por região, a ocupação, a
 * chance de passar do limite de famílias por semana e a cobertura de backup.
 * O agente da Isadora nunca vê estes números: continua recebendo só
 * "disponível" ou "confirmar com a equipe".
 */
export function VisaoCapacidade({ visao }: { visao: CapacidadeVisao }) {
  const sobrevendas = visao.alertas.filter((a) => a.nivel === "sobrevenda");
  return (
    <div className="flex flex-col gap-[18px]">
      {sobrevendas.length > 0 ? (
        <Nota tom="alerta">
          <b>
            {sobrevendas.length === 1
              ? "Uma semana com chance de sobrevenda."
              : `${sobrevendas.length} semanas com chance de sobrevenda.`}
          </b>{" "}
          A diretoria também recebe este aviso no início do dia, uma vez por
          região e semana.
          <ul className="mt-1.5 flex flex-col gap-1">
            {sobrevendas.slice(0, 6).map((a) => (
              <li key={`${a.regiaoId}-${a.semana}`}>
                <span className="font-semibold">{tituloDoAlerta(a)}.</span>{" "}
                {textoDoAlerta(a)}
              </li>
            ))}
          </ul>
        </Nota>
      ) : null}

      {visao.regioes.length === 0 ? (
        <EstadoVazio
          nivelTitulo="h2"
          ilustracao={<Broto tamanho={104} />}
          titulo="Nenhuma região com limite cadastrado"
          texto="A capacidade aparece aqui assim que uma região tiver o limite de famílias por semana em Configurações."
        />
      ) : (
        <div className="grid grid-cols-1 items-start gap-3.5 lg:grid-cols-2">
          {visao.regioes.map((r) => (
            <Card key={r.regiaoId} className="min-w-0">
              <CardHead
                titulo={r.regiao}
                direita={`Limite de ${r.limiteFamilias} ${r.limiteFamilias === 1 ? "família" : "famílias"} por semana${
                  r.semanas[0]
                    ? ` · ${r.semanas[0].profissionaisAtivas} ${r.semanas[0].profissionaisAtivas === 1 ? "profissional ativa" : "profissionais ativas"}`
                    : ""
                }`}
              />
              <CardBody className="flex flex-col gap-4">
                <div>
                  <Eyebrow className="mb-2.5 block">
                    {`Próximas ${visao.semanas} semanas`}
                  </Eyebrow>
                  <ul className="flex flex-col gap-3">
                    {r.semanas.map((s) => (
                      <li key={s.semana}>
                        <div className="mb-1 flex items-center justify-between gap-2 text-xs">
                          <span>{faixaDaSemana(s.semana)}</span>
                          <span className="flex items-center gap-2">
                            <Selo variante={VARIANTE_SELO[s.nivel]}>
                              {ROTULO_NIVEL[s.nivel]}
                            </Selo>
                            <b>{formatarPct(s.ocupacaoPct)}</b>
                          </span>
                        </div>
                        <Barra
                          valor={s.ocupacaoPct}
                          tom={
                            s.nivel === "sobrevenda"
                              ? "alerta"
                              : s.nivel === "atencao"
                                ? "aviso"
                                : "sucesso"
                          }
                          rotulo={`${r.regiao}, ${faixaDaSemana(s.semana)}, ocupação de ${formatarPct(s.ocupacaoPct)}`}
                        />
                      </li>
                    ))}
                  </ul>
                  <p className="text-tinta-50 mt-3 text-[11.5px]">
                    {`Alerta a partir de ${formatarPct(visao.limites.alertaPct)}. Sobrevenda provável quando a chance de passar o limite chega a ${formatarPct(visao.limites.sobrevendaProbPct)}.`}
                  </p>
                </div>
                <VerComoTabela
                  rotulo={`Capacidade de ${r.regiao} por semana`}
                  colunas={[
                    { chave: "semana", rotulo: "Semana", principal: true },
                    { chave: "situacao", rotulo: "Situação", canto: true },
                    { chave: "ocupacao", rotulo: "Ocupação", numerica: true },
                    {
                      chave: "esperadas",
                      rotulo: "Famílias esperadas",
                      numerica: true,
                    },
                    {
                      chave: "pior",
                      rotulo: "Pior caso razoável",
                      numerica: true,
                    },
                    {
                      chave: "chance",
                      rotulo: "Chance de passar o limite",
                      numerica: true,
                    },
                    {
                      chave: "equipe",
                      rotulo: "Equipe atende",
                      numerica: true,
                    },
                    { chave: "backup", rotulo: "Backup" },
                  ]}
                  linhas={r.semanas.map((s) => ({
                    id: `${r.regiaoId}-${s.semana}`,
                    valores: {
                      semana: `${faixaDaSemana(s.semana)}`,
                      situacao: (
                        <Selo variante={VARIANTE_SELO[s.nivel]}>
                          {ROTULO_NIVEL[s.nivel]}
                        </Selo>
                      ),
                      ocupacao: formatarPct(s.ocupacaoPct),
                      esperadas: formatarDecimal(s.familiasEsperadas),
                      pior: String(s.familiasP90),
                      chance: formatarPct(s.probExcessoPct),
                      equipe: `${s.capacidadeEquipe} ${s.capacidadeEquipe === 1 ? "família" : "famílias"}`,
                      backup: ROTULO_COBERTURA[s.cobertura],
                    },
                  }))}
                />
              </CardBody>
            </Card>
          ))}
        </div>
      )}

      <Card aria-labelledby="cap-como" role="region">
        <CardHead titulo={<span id="cap-como">Como a previsão é feita</span>} />
        <CardBody className="flex flex-col gap-3 text-[12.5px] leading-[1.6]">
          <p className="max-w-[68ch]">
            {notaDaDistribuicao(visao.distribuicao)}
          </p>
          <p className="max-w-[68ch]">
            Cada família tem uma chance de estar em atendimento em cada semana,
            que vem da data provável do parto, da distribuição do nascimento e
            do número de dias do pacote. Com essas chances, o sistema calcula a
            probabilidade de passar do limite de famílias por semana da região.
            Contrato com início já registrado conta como fato, e a data provável
            nunca dispara nada sozinha.
          </p>
          {visao.distribuicao.faixas.length > 0 ? (
            <details className="group">
              <summary className="text-texto min-h-toque inline-flex cursor-pointer list-none items-center text-[12.5px] font-semibold underline decoration-1 underline-offset-4 [&::-webkit-details-marker]:hidden">
                Ver a distribuição usada
              </summary>
              <div className="mt-3 max-w-[560px]">
                <BarrasHorizontais
                  descricao="Parte dos nascimentos em cada faixa de idade gestacional"
                  dados={faixasDaDistribuicao(visao.distribuicao)}
                />
                <p className="text-mini text-texto-2 mt-3">
                  Semanas e dias de gestação no nascimento; a data provável do
                  parto é 40s0d.
                </p>
              </div>
            </details>
          ) : null}
          <p className="text-tinta-50 text-[11.5px]">
            A Isadora nunca vê estes números: para a família, ela só diz se há
            vaga ou se precisa confirmar com a equipe. Semanas a partir de{" "}
            {dataCurta(visao.regioes[0]?.semanas[0]?.semana ?? "0000-00-00")}.
          </p>
        </CardBody>
      </Card>
    </div>
  );
}
