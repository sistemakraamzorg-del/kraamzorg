"use client";

import Link from "next/link";
import { LogOut, MapPinCheck, OctagonPause } from "lucide-react";
import { Botao } from "@/components/ui/botao";
import { cn } from "@/lib/utils";
import { horaEmBrasilia } from "@/lib/agenda/datas";
import { formatarTelefone } from "@/lib/formatacao";
import {
  fraseErroEquipe,
  ROTULO_ESTADO_VISITA,
  ROTULO_TURNO,
} from "../../equipe/textos";
import {
  proximoPasso,
  type SituacaoEnvio,
  type VisitaNaTela,
} from "../registro-local";
import {
  diaDeTotal,
  enderecoEmTexto,
  fraseEstadoSensivel,
  ligacaoDeMapa,
} from "../textos";

const TEXTO_SITUACAO: Record<SituacaoEnvio, string> = {
  sincronizado: "Sincronizado",
  no_aparelho: "Salvo no aparelho",
  erro: "Não enviou ainda",
  conflito: "Precisa da coordenação",
};

function Marca({
  rotulo,
  instante,
  situacao,
  escuro,
}: {
  rotulo: string;
  instante: string | null;
  situacao: SituacaoEnvio | null;
  escuro: boolean;
}) {
  const hora = instante ? horaEmBrasilia(instante) : null;
  return (
    <p
      className={cn(
        "flex flex-col gap-0.5 rounded-[7px] px-3 py-2",
        escuro ? "bg-marinho-2" : "border-linha bg-branco border",
      )}
      data-marca={rotulo.toLowerCase()}
    >
      <span
        className={cn(
          "text-mini font-semibold",
          escuro ? "text-dourado-2" : "text-texto-2",
        )}
      >
        {rotulo}
      </span>
      <span
        className={cn(
          "text-corpo font-mono",
          escuro ? "text-branco" : "text-texto",
        )}
      >
        {hora ?? "ainda não"}
      </span>
      {situacao ? (
        <span
          // Estado em pílula com o lavado do próprio estado: sobre o tom
          // de apoio, o texto `sucesso` sozinho ficaria em 4,4:1.
          className={cn(
            "rounded-pilula text-mini mt-1 self-start px-2 py-0.5 font-semibold",
            situacao === "sincronizado"
              ? "bg-sucesso-lavado text-sucesso"
              : situacao === "no_aparelho"
                ? "bg-aviso-lavado text-aviso-texto"
                : "bg-alerta-lavado text-alerta",
          )}
        >
          {TEXTO_SITUACAO[situacao]}
        </span>
      ) : null}
    </p>
  );
}

/**
 * Cartão da visita de hoje (protótipo enfermeira-hoje.html; P38 item 1;
 * direção "Colo", DESIGN.md 2.5 e 2.7):
 * hora e turno, o dia do acompanhamento, o nome da família, o endereço
 * (abre o mapa do aparelho), o contato em um toque, a régua de dias e, no
 * fim, a chegada e a saída com a hora gravada. Um botão só por vez
 * ("Cheguei" e depois "Saí da casa"), de 52 px, para tocar com uma mão. A
 * hora fica salva no aparelho na hora do toque, com ou sem sinal.
 */
export function CartaoVisita({
  visita: v,
  ocupado,
  aoChegar,
  aoSair,
  offline = false,
}: {
  visita: VisitaNaTela;
  ocupado: boolean;
  aoChegar: () => void;
  aoSair: () => void;
  /** Na página de sem sinal, o link para a ficha completa não existe. */
  offline?: boolean;
}) {
  const passo = proximoPasso(v);
  const endereco = enderecoEmTexto(v.endereco, v.cidade, v.bairro);
  const sensivel = fraseEstadoSensivel(v.estadoSensivel);
  const primeiroNome = v.contatoNome?.split(" ")[0] ?? null;
  // Família em freio, perda ou intercorrência: sem tom de apoio (PRD 20.2
  // [v4.4], regra 3); a hora e as linhas de contato ficam em branco.
  const semTom = v.estadoSensivel !== "normal";
  // Cores por estado, como no desenho de celular do HTML da cliente:
  // concluída em dourado, em andamento em marinho, as demais em branco.
  const emAndamento = v.estado === "iniciada";
  const concluida =
    !semTom &&
    (v.estado === "concluida" ||
      v.estado === "ficha_entregue" ||
      v.estado === "encerrada");
  const fichaPendente = !semTom && v.estado === "ficha_pendente";
  const rotuloEstado = emAndamento
    ? "Em andamento"
    : ROTULO_ESTADO_VISITA[v.estado].toLowerCase();
  const apoio = emAndamento ? "text-texto-inverso-2" : "text-texto-2";
  const linha = cn(
    "text-apoio min-h-toque flex items-center underline decoration-1 underline-offset-4",
    emAndamento ? "text-texto-inverso" : "text-texto",
  );

  return (
    <article
      className={cn(
        "flex flex-col gap-1 rounded-[9px] border p-[10px]",
        emAndamento
          ? "border-marinho bg-marinho text-texto-inverso"
          : concluida
            ? "border-linha bg-dourado-lavado"
            : fichaPendente
              ? "border-linha bg-aviso-lavado"
              : "border-linha bg-superficie",
      )}
      aria-labelledby={`visita-${v.visitaId}`}
      data-visita={v.visitaId}
      data-tour="/hoje:visita"
      data-estado-visita={v.estado}
    >
      <div
        className={cn(
          "text-mini flex flex-wrap items-center justify-between gap-x-3 font-semibold",
          emAndamento
            ? "text-dourado-2"
            : concluida
              ? "text-dourado-texto"
              : fichaPendente
                ? "text-aviso-texto"
                : "text-texto-2",
        )}
      >
        <span className="font-mono">
          {v.horaPrevista ?? "sem hora"}
          {v.turno ? ` · ${ROTULO_TURNO[v.turno]}` : ""}
        </span>
        <span>
          <span className="font-mono">
            {diaDeTotal(v.diaNumero, v.diasContratados)}
          </span>
          {` · ${rotuloEstado}`}
        </span>
      </div>

      <h3
        id={`visita-${v.visitaId}`}
        className={cn(
          "text-3 font-semibold",
          emAndamento ? "text-branco" : "text-texto",
        )}
      >
        {v.nomeExibicao}
      </h3>
      {primeiroNome ? (
        <p className={cn("text-apoio", apoio)}>
          Contato: {primeiroNome}
          {v.gemelar ? ". Gestação de gêmeos." : "."}
        </p>
      ) : null}
      {endereco ? (
        <a href={ligacaoDeMapa(endereco)} className={cn(linha, "self-start")}>
          {endereco}
          <span className="sr-only">. Abre o mapa.</span>
        </a>
      ) : null}
      {v.endereco?.referencia ? (
        <p className={cn("text-apoio", apoio)}>
          Referência: {v.endereco.referencia}
        </p>
      ) : null}
      {v.contatoTelefone ? (
        <a
          href={`tel:${v.contatoTelefone}`}
          className={cn(linha, "self-start font-mono")}
          aria-label={`Ligar para ${primeiroNome ?? "a família"}, ${formatarTelefone(v.contatoTelefone)}`}
        >
          {formatarTelefone(v.contatoTelefone)}
        </a>
      ) : null}
      {sensivel ? (
        <p
          className={cn(
            "text-apoio flex items-start gap-2",
            emAndamento ? "text-texto-inverso" : "text-sensivel",
          )}
        >
          <OctagonPause className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          {sensivel}
        </p>
      ) : null}

      <div className="mt-1 grid grid-cols-2 gap-2" aria-label="Chegada e saída">
        <Marca
          rotulo="Chegada"
          instante={v.checkinEm}
          situacao={v.chegadaSituacao}
          escuro={emAndamento}
        />
        <Marca
          rotulo="Saída"
          instante={v.checkoutEm}
          situacao={v.saidaSituacao}
          escuro={emAndamento}
        />
      </div>

      {v.erroEnvio ? (
        <p
          className={cn(
            "text-apoio",
            emAndamento ? "text-texto-inverso" : "text-alerta",
          )}
          role="status"
        >
          {fraseErroEquipe(new Error(v.erroEnvio), "enviar este registro")} O
          horário está salvo no aparelho.
        </p>
      ) : null}

      <div className="flex flex-col gap-2">
        {passo === "chegar" ? (
          <Botao
            largaTotal
            className="min-h-toque-grande"
            carregando={ocupado}
            rotuloCarregando="Gravando a chegada"
            iconeEsquerda={<MapPinCheck aria-hidden="true" />}
            onClick={aoChegar}
            data-tour="/hoje:botoes"
          >
            Cheguei
          </Botao>
        ) : null}
        {passo === "sair" ? (
          <Botao
            largaTotal
            variante="primario"
            className={cn(
              "min-h-toque-grande",
              emAndamento &&
                "border-texto-inverso-2 text-texto-inverso hover:bg-marinho-2 border bg-transparent",
            )}
            carregando={ocupado}
            rotuloCarregando="Gravando a saída"
            iconeEsquerda={<LogOut aria-hidden="true" />}
            onClick={aoSair}
            data-tour="/hoje:botoes"
          >
            Saí da casa
          </Botao>
        ) : null}
        {emAndamento && !offline ? (
          <Botao
            asChild
            largaTotal
            className="bg-dourado-2 text-marinho hover:bg-dourado-2 min-h-toque-grande"
          >
            <Link href={`/visita/${v.visitaId}`}>Preencher registro</Link>
          </Botao>
        ) : null}
        {passo === "nenhum" && v.checkoutEm ? (
          <p className={cn("text-apoio", apoio)} role="status">
            Saída gravada. A ficha deste dia ainda falta.
          </p>
        ) : null}
        {!offline ? (
          <Link
            href={`/minhas-familias/${v.familiaId}`}
            className={cn(linha, "self-start")}
          >
            Ver o acompanhamento da família
          </Link>
        ) : null}
      </div>
    </article>
  );
}
