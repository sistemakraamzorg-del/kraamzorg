import { CabecalhoTela } from "@/components/shell/cabecalho-tela";
import { Kpi } from "@/components/mockup";
import { AbasPilula } from "@/components/ui/abas-pilula";
import { FaixaAlerta } from "@/components/ui/faixa-alerta";
import { exigirSessao } from "@/lib/auth/sessao";
import { obterRepositorios } from "@/lib/dados/fabrica";
import {
  ListaDeAlertas,
  VazioDosAlertas,
  type PapelNaLista,
} from "./lista-de-alertas";
import { textosAlertas } from "./textos";

/**
 * Conteúdo comum das duas telas de alertas clínicos (P40): `/alertas` da
 * enfermeira e `/alertas-clinicos` da coordenação e da diretoria. A lista
 * vem de `api.alertas_clinicos`, que grava a leitura no log e recorta por
 * papel (enfermeira nas famílias atribuídas, coordenação e diretoria em
 * todas).
 */
export async function PaginaDeAlertas({
  caminho,
  situacao,
}: {
  /** Rota da página, para as abas e para a barreira de sessão. */
  caminho: "/alertas" | "/alertas-clinicos";
  situacao: "abertos" | "fechados";
}) {
  const sessao = await exigirSessao(caminho);
  const papel: PapelNaLista = sessao.papeis.includes("coordenacao")
    ? "coordenacao"
    : sessao.papeis.includes("diretoria")
      ? "diretoria"
      : "enfermeira";

  const { assistencial } = await obterRepositorios();
  const t = textosAlertas[papel];
  let alertas: Awaited<ReturnType<typeof assistencial.listarAlertas>>;
  let telefone: Awaited<ReturnType<typeof assistencial.telefoneSupervisao>>;
  try {
    // O telefone da supervisão só liga o botão de ligar: a falha dele não esconde a lista.
    [alertas, telefone] = await Promise.all([
      assistencial.listarAlertas(situacao),
      assistencial.telefoneSupervisao().catch(() => ""),
    ]);
  } catch (erro) {
    console.error(
      "[tela-erro] alertas clínicos",
      erro instanceof Error ? erro.message : erro,
    );
    return (
      <div className="flex flex-col gap-6 pb-8">
        <CabecalhoTela titulo={t.titulo} subtitulo={t.subtitulo} />
        <FaixaAlerta
          variante="erro"
          titulo="Os alertas clínicos não abriram agora"
        >
          Nada foi alterado. Confira a conexão e recarregue a página.
        </FaixaAlerta>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3.5 pb-8">
      <CabecalhoTela titulo={t.titulo} subtitulo={t.subtitulo} />
      <AbasPilula
        rotulo={textosAlertas.abas.rotulo}
        ativa={situacao}
        className="self-start"
        abas={(["abertos", "fechados"] as const).map((s) => ({
          valor: s,
          rotulo: textosAlertas.abas[s],
          href: s === "abertos" ? caminho : `${caminho}?situacao=${s}`,
        }))}
      />
      {alertas.length > 0 ? (
        <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-3">
          <Kpi
            rotulo={
              situacao === "abertos" ? "Alertas abertos" : "Alertas fechados"
            }
            valor={alertas.length}
          />
          <Kpi
            rotulo="Imediatos"
            valor={alertas.filter((a) => a.severidade === "imediato").length}
            delta="conduta aprovada, sem paráfrase"
            tomDelta="alerta"
          />
          <Kpi
            rotulo="Com registro completo"
            valor={
              alertas.filter(
                (a) =>
                  a.sinalIdentificado &&
                  a.acionadoEm &&
                  a.orientacaoMedica &&
                  a.condutaAdotada,
              ).length
            }
            delta="os quatro campos preenchidos"
            tomDelta="ok"
          />
        </div>
      ) : null}
      {alertas.length === 0 ? (
        <VazioDosAlertas situacao={situacao} />
      ) : (
        <ListaDeAlertas alertas={alertas} telefone={telefone} papel={papel} />
      )}
    </div>
  );
}

/** Lê `?situacao=` da URL: qualquer valor fora da lista volta para abertos. */
export function situacaoDaUrl(
  valor: string | string[] | undefined,
): "abertos" | "fechados" {
  return valor === "fechados" ? "fechados" : "abertos";
}
