"use client";

import { useActionState, useRef } from "react";
import { Card, CardHead, classesChip } from "@/components/mockup";
import { FaixaAlerta } from "@/components/ui/faixa-alerta";
import { cn } from "@/lib/utils";
import { acaoPerguntarAoCopiloto } from "../acoes";
import { estadoInicialCopiloto } from "../estado-acoes";

/**
 * Conversa do copiloto (P48), no desenho do HTML da cliente: faixa da
 * sessão, bolhas da pessoa (marinho) e do copiloto (branca), campo e botão
 * Enviar embaixo. A resposta vem com os fatos que a sustentam, calculados
 * pelo sistema (não pelo modelo), para a pessoa conferir o número. Recusa e
 * "desligado" dizem o motivo e o que fazer. As perguntas frequentes (da
 * coluna ao lado) preenchem o campo, sem enviar sozinhas.
 */
export function PainelCopiloto({
  limite,
  exemplos,
  sessao,
  lateral,
}: {
  limite: number;
  exemplos: string[];
  /** "Sessão de Fulana · Diretoria", montada no servidor. */
  sessao: string;
  /** Cartões do servidor que seguem as perguntas frequentes (limite, custo, histórico). */
  lateral?: React.ReactNode;
}) {
  const [estado, acao, enviando] = useActionState(
    acaoPerguntarAoCopiloto,
    estadoInicialCopiloto,
  );
  const campo = useRef<HTMLInputElement>(null);
  const resposta = estado.resposta;

  function preencher(texto: string) {
    if (!campo.current) return;
    campo.current.value = texto;
    campo.current.focus();
  }

  return (
    <div className="grid grid-cols-1 items-start gap-3.5 lg:grid-cols-[1fr_340px]">
      <Card>
        <CardHead
          titulo="Copiloto interno"
          direita="responde dentro das suas permissões"
        />
        <div
          role="log"
          aria-live="polite"
          aria-label="Conversa com o copiloto"
          tabIndex={0}
          className="bg-creme-2 flex h-[440px] flex-col gap-2.5 overflow-y-auto p-4"
        >
          <p className="bg-superficie border-linha text-tinta-50 self-center rounded-[20px] border px-3 py-[3px] text-[10.5px]">
            {sessao}
          </p>
          <div className="bg-superficie border-linha max-w-[76%] self-start rounded-[12px] rounded-bl-[3px] border px-3 py-[9px] text-[12.5px] leading-[1.55]">
            <div className="mb-[3px] text-[9.5px] font-semibold tracking-[0.1em] uppercase opacity-60">
              Copiloto
            </div>
            Pergunte sobre pipeline, conversão, receita, ocupação ou origem dos
            leads. Registro assistencial eu não consulto.
          </div>

          {estado.pergunta ? (
            <div className="bg-marinho text-texto-inverso max-w-[76%] self-end rounded-[12px] rounded-br-[3px] px-3 py-[9px] text-[12.5px] leading-[1.55]">
              <div className="mb-[3px] text-[9.5px] font-semibold tracking-[0.1em] uppercase opacity-60">
                Você
              </div>
              {estado.pergunta}
            </div>
          ) : null}

          {enviando ? (
            <div className="bg-superficie border-linha text-tinta-50 max-w-[76%] self-start rounded-[12px] rounded-bl-[3px] border px-3 py-[9px] text-[12.5px]">
              Consultando…
            </div>
          ) : resposta?.situacao === "respondida" ? (
            <div
              data-teste="resposta-copiloto"
              className="bg-superficie border-linha max-w-[76%] self-start rounded-[12px] rounded-bl-[3px] border px-3 py-[9px] text-[12.5px] leading-[1.55]"
            >
              <div className="mb-[3px] text-[9.5px] font-semibold tracking-[0.1em] uppercase opacity-60">
                Copiloto
              </div>
              <p className="whitespace-pre-wrap">{resposta.resposta}</p>
              <details className="text-tinta-70 mt-2 text-[11.5px]">
                <summary className="min-h-6 cursor-pointer font-semibold">
                  Como chegamos a esses números
                </summary>
                <ul className="mt-2 flex list-disc flex-col gap-1 pl-5">
                  {resposta.fatos.map((f) => (
                    <li key={f}>{f}</li>
                  ))}
                </ul>
                <p className="mt-2">
                  Consulta feita:{" "}
                  <span className="font-mono">{resposta.ferramenta}</span>, com
                  as suas permissões.
                </p>
              </details>
            </div>
          ) : null}
        </div>

        {resposta && resposta.situacao !== "respondida" && !enviando ? (
          <div className="border-linha border-t p-4">
            <FaixaAlerta
              variante={resposta.situacao === "erro" ? "erro" : "info"}
              titulo={
                resposta.situacao === "desligado"
                  ? "O copiloto está desligado"
                  : resposta.situacao === "orcamento"
                    ? "O orçamento do mês acabou"
                    : resposta.situacao === "erro"
                      ? "O copiloto não respondeu"
                      : "O copiloto não responde a esta pergunta"
              }
            >
              {resposta.mensagem}
            </FaixaAlerta>
          </div>
        ) : null}

        <form action={acao} className="border-linha flex gap-2 border-t p-4">
          <input
            ref={campo}
            name="pergunta"
            required
            maxLength={limite}
            defaultValue={estado.pergunta}
            aria-label="O que você quer saber?"
            placeholder="Pergunte sobre famílias, agenda, equipe ou números…"
            className="border-fio-2 bg-superficie text-texto focus-visible:outline-foco min-h-11 flex-1 rounded-[8px] border px-[13px] py-2.5 text-[13px] lg:min-h-0"
          />
          <button
            type="submit"
            disabled={enviando}
            className={cn(
              classesChip(true),
              "min-h-11 justify-center disabled:opacity-60 lg:min-h-0",
            )}
          >
            {enviando ? "Consultando" : "Enviar"}
          </button>
        </form>
      </Card>

      <div className="flex flex-col gap-3.5">
        {exemplos.length > 0 ? (
          <Card>
            <CardHead titulo="Perguntas frequentes" />
            <ul className="px-4 py-2.5 text-[11.5px] leading-[1.9]">
              {exemplos.map((e) => (
                <li
                  key={e}
                  className="border-fio-3 border-b py-1.5 last:border-b-0"
                >
                  <button
                    type="button"
                    onClick={() => preencher(e)}
                    className="min-h-9 w-full text-left"
                  >
                    {e}
                  </button>
                </li>
              ))}
            </ul>
          </Card>
        ) : null}
        {lateral}
      </div>
    </div>
  );
}
