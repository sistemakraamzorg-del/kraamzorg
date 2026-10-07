import type { Metadata } from "next";
import { z } from "zod";
import { FolhaLupa } from "@/components/ilustracoes";
import { CabecalhoTela } from "@/components/shell/cabecalho-tela";
import { AbasPilula } from "@/components/ui/abas-pilula";
import { Nota } from "@/components/mockup";
import { EstadoVazio } from "@/components/ui/estado-vazio";
import { FaixaAlerta } from "@/components/ui/faixa-alerta";
import { exigirSessao } from "@/lib/auth/sessao";
import { obterRepositorios } from "@/lib/dados/fabrica";
import type { Radar } from "@/lib/dados/tipos-operacao";
import {
  agruparRadar,
  contarUrgentes,
  filtrarPorPraca,
  pracasDoRadar,
} from "@/modules/operacao/radar/agrupar";
import { CronogramaRadar } from "@/modules/operacao/radar/componentes/cronograma";
import { ListasDoRadar } from "@/modules/operacao/radar/componentes/lista-compacta";
import {
  CapacidadeProjetada,
  CascataDoRadar,
  DeteccaoProativa,
} from "@/modules/operacao/radar/componentes/ocupacao";

export const metadata: Metadata = { title: "Radar · Kraamzorg OS" };

type Pesquisa = Record<string, string | string[] | undefined>;

/**
 * Radar de nascimentos (P36 item 2, fluxo C): famílias com pagamento
 * confirmado pela janela da data provável do parto, com titular e backup, o
 * que está sem contato, os check-ins pendentes, quem já nasceu e a ocupação
 * por praça. A DPP é estimativa: ela ordena a tela, nunca dispara algo
 * sozinha. Só coordenação e diretoria (PRD 13).
 */
export default async function PaginaRadar({
  searchParams,
}: {
  searchParams: Promise<Pesquisa>;
}) {
  await exigirSessao("/radar");
  const pesquisa = await searchParams;
  const pedida = Array.isArray(pesquisa.praca)
    ? pesquisa.praca[0]
    : pesquisa.praca;
  const praca = z.uuid().safeParse(pedida).success ? (pedida as string) : null;

  let radar: Radar | null = null;
  try {
    const { operacao } = await obterRepositorios();
    radar = await operacao.radar(null);
  } catch (erro) {
    console.error(
      "[tela-erro] /radar",
      erro instanceof Error ? erro.message : erro,
    );
    radar = null;
  }

  if (!radar) {
    return (
      <>
        <CabecalhoTela titulo="Radar" />
        <div className="pt-6">
          <FaixaAlerta variante="erro" titulo="O radar não abriu agora">
            Confira a conexão e recarregue a página. Nada foi alterado.
          </FaixaAlerta>
        </div>
      </>
    );
  }

  const pracas = pracasDoRadar(radar);
  const visivel = filtrarPorPraca(radar, praca);
  const grupos = agruparRadar(visivel.familias);
  const urgentes = contarUrgentes(visivel.familias);
  const vazio = visivel.familias.length === 0 && visivel.nasceram.length === 0;

  return (
    <>
      <CabecalhoTela
        titulo="Radar"
        subtitulo="Famílias com parto provável nas próximas semanas, com titular e backup de cada uma. A data provável é uma estimativa e não move nada sozinha."
      />
      <div className="flex flex-col gap-[18px] pt-6">
        <Nota>
          <b>Para que serve o radar:</b> ver quanto ainda dá para vender para
          cada período sem faltar enfermeira. Cada contrato confirmado reserva
          dias de profissional perto da data provável do parto. Quando o bebê
          nasce, essa reserva vira datas certas.
        </Nota>

        {pracas.length > 1 ? (
          <AbasPilula
            rotulo="Filtrar por praça"
            ativa={praca ?? ""}
            abas={[{ regiaoId: "", regiao: "Todas as praças" }, ...pracas].map(
              (p) => ({
                valor: p.regiaoId,
                rotulo: p.regiao,
                href: p.regiaoId ? `/radar?praca=${p.regiaoId}` : "/radar",
              }),
            )}
          />
        ) : null}

        {urgentes > 0 ? (
          <Nota tom="alerta" data-tour="/radar:urgentes">
            <b>
              {urgentes === 1
                ? "1 família precisa de você agora."
                : `${urgentes} famílias precisam de você agora.`}
            </b>{" "}
            Sem titular na janela do parto ou com a data provável passada sem
            resposta. Abra a alocação de cada uma para resolver.
          </Nota>
        ) : null}

        {vazio ? (
          <EstadoVazio
            nivelTitulo="h2"
            ilustracao={praca ? <FolhaLupa tamanho={112} /> : undefined}
            titulo={
              praca
                ? "Nenhuma família no radar nesta praça"
                : "Nenhuma família no radar por enquanto"
            }
            texto="As famílias entram aqui quando o pagamento é confirmado e a data provável do parto cai no horizonte configurado. Cada uma vira uma barra na janela do parto, e a coluna da semana muda de cor quando há sobrevenda ou família sem titular."
          />
        ) : (
          <div data-tour="/radar:cronograma" className="min-w-0">
            <CronogramaRadar radar={visivel} />
          </div>
        )}

        <div className="grid grid-cols-1 items-start gap-3.5 lg:grid-cols-[minmax(0,1fr)_340px]">
          <div data-tour="/radar:capacidade" className="min-w-0">
            <CapacidadeProjetada
              ocupacao={visivel.ocupacao}
              limitePct={visivel.limiteAlertaPct}
            />
          </div>
          <div>
            <CascataDoRadar />
            <DeteccaoProativa radar={visivel} />
          </div>
        </div>

        <ListasDoRadar
          naJanela={grupos.naJanela}
          passaram={grupos.passaramDaJanela}
          adiante={grupos.adiante}
          nasceram={visivel.nasceram}
        />
      </div>
    </>
  );
}
