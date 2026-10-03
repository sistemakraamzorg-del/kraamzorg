import { Lock } from "lucide-react";
import { MantaDobrada } from "@/components/ilustracoes";
import { Card, CardBody, CardHead } from "@/components/mockup";
import { EstadoVazio } from "@/components/ui/estado-vazio";
import { formatarDataHora } from "@/lib/formatacao";
import { cn } from "@/lib/utils";
import type { EventoTela } from "../tipos";
import { rotuloTipoEvento } from "../rotulos";

/**
 * Linha do tempo da ficha (P16 item 1; DESIGN.md seção 6, protótipo
 * `comercial-ficha.html`, classe `c4-linha`): a régua como espinha, marcos
 * na vertical. Os eventos restritos já chegam filtrados por quem pode ver
 * (o repositório da fundação decide); este componente só desenha o que
 * recebeu, com o título já em frase (`tituloEvento`, em `dados.ts`).
 */
export function LinhaDoTempo({
  eventos,
  emLuto = false,
  semTom = emLuto,
}: {
  eventos: EventoTela[];
  /**
   * Família em bloqueio total ou encerrada em estado sensível: o vazio sai
   * sem contorno tracejado e sem "ainda" (DESIGN.md 11.5 e 11.8: tracejado
   * quer dizer "ainda não" e nunca aparece em luto, onde nada está
   * pendente).
   */
  emLuto?: boolean;
  /** Freio puxado em qualquer estado: blocos sem tom de apoio. */
  semTom?: boolean;
}) {
  if (eventos.length === 0 && emLuto) {
    return (
      <p className="text-corpo text-texto-2">
        Nenhum marco registrado para esta família.
      </p>
    );
  }
  if (eventos.length === 0) {
    return (
      <EstadoVazio
        semTom={semTom}
        ilustracao={semTom ? undefined : <MantaDobrada tamanho={104} />}
        titulo="Nenhum marco registrado ainda"
        texto="O que acontece com esta família entra aqui, do mais recente para o mais antigo."
      />
    );
  }

  // Linha do tempo do mockup (`.tl`): espinha fina, um ponto por marco,
  // data em mono, título em 12,5 px. O mais recente é o "agora" (ponto de
  // sucesso com anel); os outros, o que já aconteceu (dourado). Em luto,
  // nada de tom: pontos em ameixa (DESIGN.md, 11.8).
  return (
    <Card>
      <CardHead
        titulo="Jornada completa"
        direita={`${eventos.length} ${eventos.length === 1 ? "evento" : "eventos"}`}
      />
      <CardBody>
        <ol
          className="before:bg-fio-2 relative pl-[22px] before:absolute before:top-[5px] before:bottom-[5px] before:left-[5px] before:w-px before:content-['']"
          aria-label="Marcos da família"
        >
          {eventos.map((evento, i) => (
            <li
              key={evento.id}
              className={cn(
                "relative pb-[15px] last:pb-0",
                "before:absolute before:top-1 before:-left-[21px] before:size-[9px] before:rounded-full before:border-[1.5px] before:content-['']",
                semTom
                  ? "before:border-sensivel before:bg-sensivel"
                  : i === 0
                    ? "before:border-sucesso before:bg-sucesso before:shadow-[0_0_0_3px_var(--sucesso-lavado)]"
                    : "before:border-dourado before:bg-dourado",
              )}
            >
              <div className="text-tinta-50 font-mono text-[10.5px] tabular-nums">
                {formatarDataHora(evento.criadoEm) ?? evento.criadoEm}
              </div>
              <div className="mt-px flex items-center gap-1.5 text-[12.5px]">
                {evento.restrito ? (
                  <Lock
                    aria-hidden="true"
                    className="text-tinta-50 size-3.5 shrink-0"
                  />
                ) : null}
                {evento.titulo || rotuloTipoEvento(evento.tipo)}
              </div>
              {evento.restrito ? (
                <div className="text-tinta-50 text-[11px]">
                  Evento restrito, visível só para a coordenação e a diretoria.
                </div>
              ) : null}
            </li>
          ))}
        </ol>
      </CardBody>
    </Card>
  );
}
