"use client";

import * as React from "react";
import { useActionState } from "react";
import { useRouter } from "next/navigation";
import { AvisoEfemero } from "@/components/ui/aviso-efemero";
import { BotaoFreio } from "@/components/ui/botao-freio";
import { Card, Nota } from "@/components/mockup";
import { FaixaAlerta } from "@/components/ui/faixa-alerta";
import { formatarDataHora } from "@/lib/formatacao";
import { OctagonPause } from "lucide-react";
import type { EstadoSensivel } from "@/lib/dados/tipos";
import { acaoAcionarFreio, acaoDesfazerFreio } from "../acoes";
import { estadoInicialFicha } from "../estado-acoes";
import { FaixaJustificarFreio } from "./faixa-justificar-freio";
import { FolhaReverterFreio } from "./folha-reverter-freio";

function textoFreioAtivo(estado: EstadoSensivel, em: string | null): string {
  const quando = em ? formatarDataHora(em) : null;
  const desde = quando ? ` desde ${quando}` : "";
  if (estado === "atencao") {
    return `Freio em atenção${desde}. Conteúdo e marketing pausados; os avisos da operação continuam.`;
  }
  if (estado === "encerrado_sensivel") {
    return `Encerrado em estado sensível${desde}. Nenhuma pesquisa, pedido de indicação ou remarketing sai mais para esta família.`;
  }
  return `Freio em bloqueio total${desde}. Só contato humano e pelo nome.`;
}

export interface CabecalhoFichaProps {
  familiaId: string;
  nome: string;
  /** Selos do canto direito (estágio, semana da gestação). */
  meta: React.ReactNode;
  /** Linha pequena sob o nome: as pessoas da família e o lugar. */
  subtitulo?: React.ReactNode;
  /** Abas da ficha: ficam coladas na base do cartão do cabeçalho (`.tabs`). */
  abas?: React.ReactNode;
  estadoSensivelInicial: EstadoSensivel;
  estadoSensivelEmInicial: string | null;
  /** Papel de coordenação ou diretoria: pode abrir a folha de reversão. */
  podeReverter: boolean;
  /**
   * Reserva para o prazo do "Desfazer" quando a resposta do acionamento
   * não traz `desfazer_ate`. O normal é vir da resposta do banco, porque
   * só a diretoria lê `parametro`.
   */
  freioDesfazerSegundos?: number;
  /**
   * Quem está na tela tem a tarefa "Justificar o freio" aberta
   * (`temJustificativaPendente`). Opcional porque outras telas da família
   * (a conversa, P27) usam este cabeçalho sem ler tarefas: sem a prop, a
   * faixa aparece logo depois do toque de quem acionou, nesta visita.
   */
  justificativaPendente?: boolean;
  /** Vencimento da tarefa de justificativa, para o prazo na faixa (P2 item 13). */
  justificativaVenceEm?: string | null;
}

/**
 * Cabeçalho da família com o freio em um toque (P16 item 2; DESIGN.md,
 * seção 6, `familia-cab`). O `CabecalhoFamilia` e o `BotaoFreio` já existem
 * na fundação (`src/components/ui`); este componente só liga os dois às
 * ações do módulo (acionar, desfazer, reverter) e ao aviso efêmero.
 */
export function CabecalhoFicha({
  familiaId,
  nome,
  meta,
  subtitulo,
  abas,
  estadoSensivelInicial,
  estadoSensivelEmInicial,
  podeReverter,
  freioDesfazerSegundos = 0,
  justificativaPendente = false,
  justificativaVenceEm = null,
}: CabecalhoFichaProps) {
  const router = useRouter();
  const formDesfazerRef = React.useRef<HTMLFormElement>(null);
  const [avisoAberto, definirAvisoAberto] = React.useState(false);
  const [avisoTexto, definirAvisoTexto] = React.useState<React.ReactNode>(null);
  // Segundos do "Desfazer" deste acionamento (0 = sem "Desfazer"). Vem da
  // resposta do banco (`desfazer_ate`); a prop é só o valor de reserva.
  const [prazoDesfazer, definirPrazoDesfazer] = React.useState(0);
  const podeDesfazer = prazoDesfazer > 0;
  const [reverterAberto, definirReverterAberto] = React.useState(false);
  // Quem acabou de acionar tem a tarefa de justificativa (PRD 8.3), mesmo
  // numa tela que não lê tarefas.
  const [acionouAgora, definirAcionouAgora] = React.useState(false);

  const freioAtivo = estadoSensivelInicial !== "normal";
  const refSelo = React.useRef<HTMLButtonElement | HTMLSpanElement>(null);
  const freioAtivoAnterior = React.useRef(freioAtivo);
  React.useEffect(() => {
    // O botão de freio (que tinha o foco) some do DOM quando o freio liga;
    // sem isto, o foco cai no <body>. Leva o foco para o selo "Freio ativo"
    // que aparece no lugar dele.
    if (freioAtivo && !freioAtivoAnterior.current) refSelo.current?.focus();
    freioAtivoAnterior.current = freioAtivo;
  }, [freioAtivo]);
  const iniciais = nome
    .split(/\s+/)
    .slice(0, 2)
    .map((palavra) => palavra.charAt(0).toUpperCase())
    .join("");
  // Estável entre renderizações: o AvisoEfemero reinicia o temporizador
  // quando esta função muda, e o router.refresh() re-renderiza a ficha
  // logo depois do toque (o "Desfazer" não pode durar mais que o prazo).
  const fecharAviso = React.useCallback(() => definirAvisoAberto(false), []);

  const [estadoAcionar, acaoAcionar, acionando] = useActionState(
    async (_anterior: typeof estadoInicialFicha, formulario: FormData) => {
      const resultado = await acaoAcionarFreio(estadoInicialFicha, formulario);
      if (!resultado.erro) {
        definirAvisoTexto(
          `Freio acionado. Nenhuma mensagem automática sai para ${nome}.`,
        );
        definirPrazoDesfazer(
          resultado.desfazerSegundos ?? freioDesfazerSegundos,
        );
        definirAcionouAgora(true);
        definirAvisoAberto(true);
        router.refresh();
      }
      return resultado;
    },
    estadoInicialFicha,
  );

  const [, acaoDesfazer] = useActionState(
    async (_anterior: typeof estadoInicialFicha, formulario: FormData) => {
      const resultado = await acaoDesfazerFreio(estadoInicialFicha, formulario);
      if (!resultado.erro) {
        definirAvisoAberto(false);
        definirAcionouAgora(false);
        router.refresh();
      } else {
        definirAvisoTexto(resultado.erro);
        definirPrazoDesfazer(0);
        definirAvisoAberto(true);
      }
      return resultado;
    },
    estadoInicialFicha,
  );

  return (
    <div className="flex flex-col gap-3">
      <Card>
        <div className="flex flex-wrap items-center gap-3.5 px-[18px] py-4">
          <div
            aria-hidden="true"
            className={
              freioAtivo
                ? "bg-areia text-marinho grid size-11 flex-none place-items-center rounded-full text-[15px] font-semibold"
                : "bg-dourado-2 text-marinho grid size-11 flex-none place-items-center rounded-full text-[15px] font-semibold"
            }
          >
            {iniciais}
          </div>
          <div className="min-w-0">
            <h1 className="font-titulo text-[22px] leading-tight font-light">
              {nome}
            </h1>
            {subtitulo ? (
              <div className="text-tinta-50 text-[11.5px]">{subtitulo}</div>
            ) : null}
          </div>
          <div className="ml-auto flex flex-wrap items-center gap-[7px]">
            {meta}
            {freioAtivo ? (
              podeReverter ? (
                <button
                  ref={refSelo as React.Ref<HTMLButtonElement>}
                  type="button"
                  onClick={() => definirReverterAberto(true)}
                  className="rounded-pilula bg-sensivel-lavado text-sensivel-texto min-h-toque inline-flex items-center gap-1.5 px-3 text-[11.5px] font-semibold whitespace-nowrap"
                >
                  <OctagonPause className="size-4" aria-hidden="true" />
                  Freio ativo
                </button>
              ) : (
                <span
                  ref={refSelo as React.Ref<HTMLSpanElement>}
                  tabIndex={-1}
                  className="rounded-pilula bg-sensivel-lavado text-sensivel-texto inline-flex items-center gap-1.5 px-3 py-1.5 text-[11.5px] font-semibold whitespace-nowrap"
                >
                  <OctagonPause className="size-4" aria-hidden="true" />
                  Freio ativo
                </span>
              )
            ) : (
              <form action={acaoAcionar}>
                <input type="hidden" name="familiaId" value={familiaId} />
                <BotaoFreio
                  type="submit"
                  aria-busy={acionando || undefined}
                  aria-label={`Freio: pausa na hora todas as mensagens automáticas para ${nome}`}
                >
                  Freio
                </BotaoFreio>
              </form>
            )}
          </div>
        </div>
        {freioAtivo ? (
          <div className="px-[18px] pb-4">
            <Nota tom="sensivel" role="status">
              {textoFreioAtivo(estadoSensivelInicial, estadoSensivelEmInicial)}
            </Nota>
          </div>
        ) : null}
        {abas}
      </Card>

      {estadoAcionar.erro ? (
        <FaixaAlerta variante="erro" titulo={estadoAcionar.erro} />
      ) : null}

      {freioAtivo ? (
        <FaixaJustificarFreio
          familiaId={familiaId}
          pendente={justificativaPendente || acionouAgora}
          venceEm={justificativaVenceEm}
        />
      ) : null}

      <form ref={formDesfazerRef} action={acaoDesfazer} hidden>
        <input type="hidden" name="familiaId" value={familiaId} />
      </form>
      <AvisoEfemero
        aberto={avisoAberto}
        aoFechar={fecharAviso}
        texto={avisoTexto}
        duracaoSegundos={podeDesfazer ? prazoDesfazer : 6}
        rotuloAcao={podeDesfazer ? "Desfazer" : undefined}
        aoAcionarAcao={
          podeDesfazer
            ? () => formDesfazerRef.current?.requestSubmit()
            : undefined
        }
      />

      {podeReverter ? (
        <FolhaReverterFreio
          familiaId={familiaId}
          nome={nome}
          estadoAtual={estadoSensivelInicial}
          aberto={reverterAberto}
          aoFechar={() => definirReverterAberto(false)}
          aoSalvar={({ texto }) => {
            definirAvisoTexto(texto);
            definirPrazoDesfazer(0);
            definirAvisoAberto(true);
            router.refresh();
          }}
        />
      ) : null}
    </div>
  );
}
