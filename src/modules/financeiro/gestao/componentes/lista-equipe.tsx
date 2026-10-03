import { MantaDobrada } from "@/components/ilustracoes";
import { EstadoVazio } from "@/components/ui/estado-vazio";
import { Kpi } from "@/components/mockup";
import { BlocoTabela, Grade } from "../../mockup-ui";
import { Selo } from "@/components/ui/selo";
import type {
  PagamentoEquipe,
  PagamentosEquipe,
} from "@/lib/dados/tipos-gestao";
import { formatarData, formatarMoeda } from "@/lib/formatacao";
import { formatarDecimal, rotuloMes } from "@/lib/gestao/formato";
import { plural, ROTULO_STATUS_PAGAMENTO, TEXTO_BLOQUEIO } from "../textos";
import { PagarEquipe } from "./pagar-equipe";

/** Frase de abertura da tela de pagamento da equipe. */
export function fraseEquipe(p: PagamentosEquipe): string {
  const r = p.resumo;
  if (p.pagamentos.length === 0) {
    return "Ainda não há visita realizada para gerar pagamento.";
  }
  const partes: string[] = [];
  if (r.liberadoQtd > 0) {
    partes.push(
      `${plural(r.liberadoQtd, "pagamento liberado", "pagamentos liberados")}, ${formatarMoeda(r.liberadoCentavos)}`,
    );
  }
  if (r.bloqueadoQtd > 0) {
    partes.push(
      `${plural(r.bloqueadoQtd, "pagamento bloqueado", "pagamentos bloqueados")}, ${formatarMoeda(r.bloqueadoCentavos)}`,
    );
  }
  partes.push(
    `${formatarMoeda(r.pagoNoMesCentavos)} pagos em ${rotuloMes(r.mes)}`,
  );
  return `${partes.join("; ")}.`;
}

const VARIANTE = {
  bloqueado: "aviso",
  liberado: "sucesso",
  pago: "neutro",
} as const;

function Conta({ p }: { p: PagamentoEquipe }) {
  const horasPorVisita = p.visitas > 0 ? p.horas / p.visitas : 0;
  return (
    <p className="text-apoio text-texto-2 max-w-[62ch]">
      {plural(p.visitas, "visita", "visitas")} de{" "}
      {formatarDecimal(horasPorVisita)}{" "}
      {horasPorVisita === 1 ? "hora" : "horas"}: {formatarDecimal(p.horas)}{" "}
      {p.horas === 1 ? "hora" : "horas"}
      {p.valorHoraCentavos !== null
        ? ` a ${formatarMoeda(p.valorHoraCentavos)} = ${formatarMoeda(p.valorHorasCentavos)}`
        : ""}
      {p.ajudaDeslocamentoCentavos > 0
        ? `, mais ${formatarMoeda(p.ajudaDeslocamentoCentavos)} de ajuda de deslocamento`
        : ""}
      .
    </p>
  );
}

/**
 * Pagamento da equipe (P46 item 3): horas por visita vezes o valor da hora,
 * mais a ajuda de deslocamento, liberado só depois do envio das evoluções aos
 * médicos. Bloqueado diz o que falta; liberado pede o dia do pagamento.
 */
export function ListaEquipe({
  dados,
  hoje,
}: {
  dados: PagamentosEquipe;
  hoje: string;
}) {
  if (dados.pagamentos.length === 0) {
    return (
      <EstadoVazio
        nivelTitulo="h2"
        ilustracao={<MantaDobrada tamanho={104} />}
        titulo="Nenhum pagamento por enquanto"
        texto="Os pagamentos nascem das visitas realizadas. Quando a primeira visita for concluída, a profissional aparece aqui, bloqueada até o envio das evoluções aos médicos."
      />
    );
  }
  // Faixa-resumo no desenho do Painel e, abaixo, três painéis pela situação:
  // o que dá para pagar agora vem primeiro, depois o que espera as
  // evoluções e, no fim, o que já foi pago.
  const r = dados.resumo;
  return (
    <div className="flex flex-col gap-3.5">
      <Grade colunas={3}>
        <Kpi
          rotulo="Liberados para pagar"
          valor={formatarMoeda(r.liberadoCentavos)}
          delta={`${plural(r.liberadoQtd, "pagamento liberado", "pagamentos liberados")}.`}
        />
        <Kpi
          rotulo="Esperando as evoluções"
          valor={formatarMoeda(r.bloqueadoCentavos)}
          delta={`${plural(r.bloqueadoQtd, "pagamento bloqueado", "pagamentos bloqueados")} até o envio aos médicos.`}
        />
        <Kpi
          rotulo={`Pagos em ${rotuloMes(r.mes)}`}
          valor={formatarMoeda(r.pagoNoMesCentavos)}
          delta={`${plural(r.pagoNoMesQtd, "pagamento feito", "pagamentos feitos")} no mês.`}
          tomDelta="ok"
        />
      </Grade>
      {GRUPOS.map((grupo) => {
        const doGrupo = dados.pagamentos.filter(
          (p) => p.status === grupo.status,
        );
        if (doGrupo.length === 0) return null;
        return (
          <div
            key={grupo.status}
            id={`equipe-${grupo.status}`}
            className="scroll-mt-24"
          >
            <BlocoTabela
              titulo={grupo.titulo}
              direita={plural(doGrupo.length, "pagamento", "pagamentos")}
            >
              <ul className="grid grid-cols-1 items-start gap-3 p-4 lg:grid-cols-2">
                {doGrupo.map((p) => (
                  <CartaoPagamento key={p.id} p={p} hoje={hoje} />
                ))}
              </ul>
            </BlocoTabela>
          </div>
        );
      })}
    </div>
  );
}

const GRUPOS: { status: PagamentoEquipe["status"]; titulo: string }[] = [
  { status: "liberado", titulo: "Liberados para pagar" },
  { status: "bloqueado", titulo: "Esperando as evoluções" },
  { status: "pago", titulo: "Pagos no mês" },
];

function CartaoPagamento({ p, hoje }: { p: PagamentoEquipe; hoje: string }) {
  return (
    <li className="rounded-2 border-linha bg-superficie flex flex-col gap-3 border p-4">
      <div className="flex items-start gap-3">
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <h3 className="font-titulo text-3 text-texto font-medium">
            {p.profissionalNome}
          </h3>
          <p className="text-apoio text-texto-2">
            {p.familiaNome ?? "Família"}
          </p>
        </div>
        <Selo variante={VARIANTE[p.status]}>
          {ROTULO_STATUS_PAGAMENTO[p.status]}
        </Selo>
      </div>
      <p className="font-titulo text-numero-sm text-texto font-medium tabular-nums">
        {formatarMoeda(p.totalCentavos)}
      </p>
      <Conta p={p} />
      {p.status === "bloqueado" && p.motivoBloqueio ? (
        <p className="text-corpo text-texto max-w-[62ch]">
          {TEXTO_BLOQUEIO[p.motivoBloqueio]}
        </p>
      ) : null}
      {p.status === "liberado" ? (
        <PagarEquipe
          pagamentoId={p.id}
          profissionalNome={p.profissionalNome}
          hoje={hoje}
        />
      ) : null}
      {p.status === "pago" ? (
        <p className="text-apoio text-texto">
          Pago em{" "}
          {p.pagoEm
            ? (formatarData(p.pagoEm) ?? p.pagoEm)
            : "data não registrada"}
          .
        </p>
      ) : null}
    </li>
  );
}
