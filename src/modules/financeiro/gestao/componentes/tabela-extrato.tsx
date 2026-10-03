import Link from "next/link";
import { FolhaLupa } from "@/components/ilustracoes";
import { EstadoVazio } from "@/components/ui/estado-vazio";
import { BlocoForm, CLASSE_TABELA } from "../../mockup-ui";
import { Selo } from "@/components/ui/selo";
import { TabelaLista } from "@/components/ui/tabela-lista";
import { cn } from "@/lib/utils";
import type {
  ExtratoVisao,
  ImportacaoExtrato,
  LinhaExtrato,
  SituacaoExtrato,
} from "@/lib/dados/tipos-gestao";
import {
  formatarData,
  formatarDataHora,
  formatarMoeda,
} from "@/lib/formatacao";
import { plural, ROTULO_SITUACAO_EXTRATO } from "../textos";
import { ReconferirExtrato } from "./importar-extrato";

const VARIANTE: Record<SituacaoExtrato, "sucesso" | "aviso" | "neutro"> = {
  conferida: "sucesso",
  sugerida: "aviso",
  sem_correspondencia: "neutro",
};

/** Frase de abertura da tela do extrato. */
export function fraseExtrato(
  v: ExtratoVisao,
  importacaoId: string | null,
): string {
  const escolhida = v.importacoes.find((i) => i.id === importacaoId);
  if (escolhida) {
    return `${plural(escolhida.linhas, "lançamento", "lançamentos")} no arquivo: ${escolhida.conferidas} conferidos, ${escolhida.sugeridas} com par sugerido e ${escolhida.semCorrespondencia} sem correspondência.`;
  }
  if (v.importacoes.length === 0) {
    return "Importe o extrato do banco para conferir o que entrou e o que saiu com as cobranças e as despesas.";
  }
  return `${plural(v.importacoes.length, "extrato importado", "extratos importados")}. Abra um para ver a conferência.`;
}

function periodo(i: ImportacaoExtrato): string {
  if (!i.periodoInicio || !i.periodoFim) return "período não informado";
  return `${formatarData(i.periodoInicio) ?? i.periodoInicio} a ${formatarData(i.periodoFim) ?? i.periodoFim}`;
}

function ParDaLinha({ l }: { l: LinhaExtrato }) {
  if (l.cobrancaId) {
    return (
      <span>
        <Link
          href={`/cobrancas/${l.cobrancaId}`}
          className="text-texto font-semibold underline decoration-1 underline-offset-4"
        >
          {l.familiaNome ?? "Cobrança"}
          {l.cobrancaParcela && l.cobrancaParcela > 1
            ? `, parcela ${l.cobrancaParcela}`
            : ""}
        </Link>
        {l.situacao === "sugerida" ? (
          <span className="text-mini text-texto-2 block">
            A cobrança segue em aberto. Se o pagamento chegou, dê a baixa pela
            própria cobrança.
          </span>
        ) : null}
      </span>
    );
  }
  if (l.despesaId) {
    return <span>{l.despesaDescricao ?? "Despesa"}</span>;
  }
  return (
    <span className="text-texto-2">
      Nenhuma cobrança nem despesa com este valor perto desta data.
    </span>
  );
}

/**
 * Importações de extrato e, quando uma está aberta, as linhas dela com o par
 * encontrado. O extrato só confere: cobrança sugerida continua aberta até o
 * webhook ou a baixa manual com comprovante (D-07).
 */
export function VisaoExtrato({
  visao,
  importacaoId,
}: {
  visao: ExtratoVisao;
  importacaoId: string | null;
}) {
  return (
    <div className="flex flex-col gap-3.5">
      {visao.importacoes.length > 0 ? (
        <BlocoForm
          titulo="Extratos importados"
          nota="Abra um para ver a conferência, linha por linha."
        >
          <ul className="flex flex-col gap-2">
            {visao.importacoes.map((i) => {
              const aberta = i.id === importacaoId;
              return (
                <li key={i.id}>
                  <Link
                    href={
                      aberta
                        ? "/financeiro/extrato"
                        : `/financeiro/extrato?importacao=${i.id}`
                    }
                    aria-current={aberta ? "page" : undefined}
                    className={cn(
                      "rounded-2 border-linha ease-estado min-h-toque hover:border-dourado flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border p-4 no-underline transition-colors duration-140",
                      // O extrato aberto leva o único acento dourado.
                      aberta
                        ? "border-dourado bg-areia-clara"
                        : "bg-superficie",
                    )}
                  >
                    <span className="text-corpo text-texto font-semibold">
                      {periodo(i)}
                    </span>
                    <span className="text-apoio text-texto-2">
                      {plural(i.linhas, "lançamento", "lançamentos")}, importado
                      em {formatarDataHora(i.importadoEm) ?? i.importadoEm}
                    </span>
                    <span className="flex flex-wrap gap-2">
                      <Selo variante="sucesso">{i.conferidas} conferidas</Selo>
                      <Selo variante="aviso">{i.sugeridas} sugeridas</Selo>
                      <Selo variante="neutro">
                        {i.semCorrespondencia} sem par
                      </Selo>
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </BlocoForm>
      ) : null}

      {importacaoId ? (
        <BlocoForm
          titulo="Conferência"
          nota="O par que o sistema encontrou para cada lançamento do banco."
        >
          <div className="flex flex-col gap-4">
            <ReconferirExtrato importacaoId={importacaoId} />
            {visao.linhas.length === 0 ? (
              <EstadoVazio
                nivelTitulo="h3"
                ilustracao={<FolhaLupa tamanho={96} />}
                titulo="Esse extrato não tem lançamentos para mostrar"
                texto="Escolha outro extrato da lista ou importe um arquivo novo."
              />
            ) : (
              <TabelaLista
                className={CLASSE_TABELA}
                rotulo="Lançamentos do extrato e o par de cada um"
                colunas={[
                  { chave: "descricao", rotulo: "Lançamento", principal: true },
                  { chave: "situacao", rotulo: "Situação", canto: true },
                  { chave: "data", rotulo: "Dia" },
                  { chave: "valor", rotulo: "Valor", numerica: true },
                  { chave: "par", rotulo: "Par encontrado" },
                ]}
                linhas={visao.linhas.map((l) => ({
                  id: l.id,
                  valores: {
                    descricao: l.descricao,
                    situacao: (
                      <Selo variante={VARIANTE[l.situacao]}>
                        {ROTULO_SITUACAO_EXTRATO[l.situacao]}
                      </Selo>
                    ),
                    data: formatarData(l.data) ?? l.data,
                    valor: formatarMoeda(l.valorCentavos),
                    par: <ParDaLinha l={l} />,
                  },
                }))}
              />
            )}
          </div>
        </BlocoForm>
      ) : null}
    </div>
  );
}
