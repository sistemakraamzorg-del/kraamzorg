import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * Peças visuais do quadro do mockup da Camila (`.kanban`, `.col`, `.col-h`,
 * `.kc`, `.score`), usadas pelos quadros editável e somente leitura. As
 * medidas em px são a transcrição do CSS dela.
 */

/** Trilho das colunas: grade de 11 px no computador, rolagem lateral no celular. */
export const CLASSE_QUADRO =
  "-mx-4 flex snap-x snap-mandatory items-start gap-[11px] overflow-x-auto px-4 pb-1 lg:mx-0 lg:grid lg:snap-none lg:grid-flow-col lg:auto-cols-[minmax(14rem,1fr)] lg:px-0";

/** Fundo e borda da coluna (`.col`). */
export const CLASSE_COLUNA =
  "rounded-3 border-linha bg-creme-2 flex w-[17.5rem] flex-none snap-start flex-col border p-[9px] lg:w-auto";

/** Ponto de cor do cabeçalho de cada estágio (só tokens do tema). */
const PONTO: Record<string, string> = {
  novo: "bg-tinta-30",
  em_conversa_ia: "bg-dourado",
  qualificado: "bg-aviso",
  sessao_venda_agendada: "bg-marinho-3",
  sessao_venda_realizada: "bg-sucesso",
  nutricao: "bg-areia-2",
  nao_qualificado: "bg-tinta-30",
  fora_de_cobertura: "bg-tinta-30",
  perdido: "bg-sensivel",
  proposta_enviada: "bg-dourado-2",
  em_negociacao: "bg-aviso",
  ganho: "bg-sucesso",
  contrato_gerado: "bg-dourado-2",
  aguardando_assinatura: "bg-marinho-3",
  assinado: "bg-sucesso",
  cobranca_gerada: "bg-alerta",
  pagamento_confirmado: "bg-sucesso",
  consulta_prenatal_agendada: "bg-dourado",
  aguardando_nascimento: "bg-areia-2",
  suspenso: "bg-sensivel",
  intercorrencia: "bg-sensivel",
};

export function pontoEstagio(estagio: string): string {
  return PONTO[estagio] ?? "bg-areia-2";
}

/** `.col-h`: ponto de 6 px, rótulo 12/600 e contagem em mono 11 px. */
export function CabecalhoColuna({
  id,
  estagio,
  rotulo,
  contagem,
  dica,
  className,
}: {
  id: string;
  estagio: string;
  rotulo: string;
  contagem: number;
  dica: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex min-h-6 flex-none items-center gap-[7px] px-1 pt-0.5 pb-[9px]",
        className,
      )}
    >
      <span
        aria-hidden="true"
        className={`size-1.5 flex-none rounded-full ${pontoEstagio(estagio)}`}
      />
      <h2
        id={id}
        className="min-w-0 flex-1 truncate font-sans text-[12px] font-semibold"
      >
        {rotulo}
      </h2>
      <span
        tabIndex={0}
        aria-label={dica}
        title={dica}
        className="text-tinta-50 ml-auto font-mono text-[11px]"
      >
        {contagem}
      </span>
    </div>
  );
}

/** Pontuação do cartão (`.score`): h quente, m morna, l fria. */
export function PontuacaoCartao({
  valor,
  classificacao,
  title,
}: {
  valor: number;
  classificacao: string | null;
  title?: string;
}) {
  const tom =
    classificacao === "quente"
      ? "bg-alerta-lavado text-alerta-texto"
      : classificacao === "morno"
        ? "bg-aviso-lavado text-aviso-texto"
        : "bg-cinza-lavado text-tinta-70";
  return (
    <span
      title={title}
      className={`rounded-[4px] px-[5px] py-px font-mono text-[10.5px] font-medium ${tom}`}
    >
      {valor}
    </span>
  );
}

/** Etiqueta pequena do rodapé do cartão (`.tag` a 9.5 px). */
export const ETIQUETA_MIUDA = "text-[9.5px]";

/** Moldura do cartão (`.kc`): borda, raio de 8 px, 10 px de respiro. */
export const CLASSE_CARTAO =
  "border-linha bg-branco hover:shadow-1 rounded-[8px] border p-2.5 motion-safe:transition-[transform,box-shadow] motion-safe:duration-140 motion-safe:hover:-translate-y-px";

/** Rodapé do cartão (`.f`): filete, 8 px de folga. */
export const CLASSE_RODAPE =
  "border-fio-3 mt-2 flex flex-wrap items-center gap-1.5 border-t pt-2";
