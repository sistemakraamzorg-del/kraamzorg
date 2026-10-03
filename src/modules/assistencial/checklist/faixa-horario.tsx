"use client";

import * as React from "react";
import { Botao } from "@/components/ui/botao";
import { horaEmBrasilia } from "@/lib/agenda/datas";
import type { BancoOffline } from "@/lib/sync";
import { lerDiaDoAparelho } from "@/modules/operacao/portal/cache-portal";
import {
  lerMarcasLocais,
  registrarChegadaNoAparelho,
  registrarSaidaNoAparelho,
} from "@/modules/operacao/portal/registro-local";
import type { VisitaChecklist } from "@/lib/dados/tipos-assistencial";
import {
  instanteEmBrasilia,
  minutosFeitos,
  resumoDoIntervalo,
} from "./horario-visita";

/**
 * Chegada e saída no cabeçalho do checklist. Não é campo clínico: é o
 * registro da visita (visita.checkin_em e checkout_em). Grava pelo mesmo
 * caminho offline da tela Hoje (fila do aparelho, sobe sozinho); a hora
 * vem preenchida com agora, em Brasília, e pode ser ajustada antes de
 * registrar. A duração prevista vem da visita guardada no aparelho.
 */
export function FaixaHorario({
  visita,
  banco,
  usuarioId,
  somenteLeitura = false,
}: {
  visita: VisitaChecklist;
  banco: BancoOffline | null;
  usuarioId: string;
  somenteLeitura?: boolean;
}) {
  const [marcas, definirMarcas] = React.useState<{
    chegada: string | null;
    saida: string | null;
  }>({ chegada: null, saida: null });
  const [horasPrevistas, definirHoras] = React.useState<number | null>(null);
  const [ocupado, definirOcupado] = React.useState(false);
  const [hora, definirHora] = React.useState("");

  const ler = React.useCallback(async () => {
    if (!banco) return;
    const m = await lerMarcasLocais(banco, visita.id).catch(() => null);
    if (m) {
      definirMarcas({
        chegada: m.chegada?.valor ?? null,
        saida: m.saida?.valor ?? null,
      });
    }
  }, [banco, visita.id]);

  React.useEffect(() => {
    const espera = window.setTimeout(() => void ler(), 0);
    return () => window.clearTimeout(espera);
  }, [ler]);

  React.useEffect(() => {
    if (!banco) return;
    let ativo = true;
    void lerDiaDoAparelho(banco)
      .then((dia) => {
        const v = dia?.visitas.find((x) => x.visitaId === visita.id);
        if (ativo && v?.horasPorVisita) definirHoras(v.horasPorVisita);
      })
      .catch(() => undefined);
    return () => {
      ativo = false;
    };
  }, [banco, visita.id]);

  const chegada = visita.checkinEm ?? marcas.chegada;
  const saida = visita.checkoutEm ?? marcas.saida;
  const passo = !chegada ? "chegada" : !saida ? "saida" : null;
  const feitos = minutosFeitos(chegada, saida);
  const resumo = resumoDoIntervalo(horasPrevistas, feitos);
  const mostrar = (i: string | null) => (i ? horaEmBrasilia(i) : null);

  async function registrar() {
    if (!banco || !passo) return;
    definirOcupado(true);
    try {
      const ajustada = hora ? instanteEmBrasilia(visita.data, hora) : null;
      const quando = ajustada ?? new Date();
      if (passo === "chegada") {
        await registrarChegadaNoAparelho(
          banco,
          usuarioId,
          {
            visitaId: visita.id,
            versao: visita.versao,
          },
          quando,
        );
      } else {
        await registrarSaidaNoAparelho(
          banco,
          usuarioId,
          {
            visitaId: visita.id,
            versao: visita.versao,
          },
          quando,
        );
      }
      definirHora("");
      await ler();
    } finally {
      definirOcupado(false);
    }
  }

  return (
    <section
      aria-label="Chegada e saída"
      className="rounded-2 bg-superficie border-linha mt-3 flex flex-col gap-2 border p-3"
    >
      <dl className="grid grid-cols-2 gap-2">
        <div>
          <dt className="text-apoio text-texto-2">Chegada</dt>
          <dd className="text-corpo text-texto font-mono font-semibold">
            {mostrar(chegada) ?? "Ainda não registrada"}
          </dd>
        </div>
        <div>
          <dt className="text-apoio text-texto-2">Saída</dt>
          <dd className="text-corpo text-texto font-mono font-semibold">
            {mostrar(saida) ?? "Ainda não registrada"}
          </dd>
        </div>
      </dl>
      {resumo ? (
        <p className="text-apoio text-texto-2" role="status">
          {resumo}
        </p>
      ) : null}
      {!somenteLeitura && passo ? (
        <div className="flex flex-wrap items-end gap-2">
          <label className="text-apoio text-texto-2 flex flex-col gap-1">
            Hora (Brasília), se precisar ajustar
            <input
              type="time"
              value={hora}
              onChange={(e) => definirHora(e.target.value)}
              placeholder={horaEmBrasilia(new Date()) ?? ""}
              className="rounded-2 border-linha min-h-toque text-corpo border px-3 font-mono"
            />
          </label>
          <Botao
            carregando={ocupado}
            rotuloCarregando="Gravando"
            onClick={() => void registrar()}
            disabled={!banco}
          >
            {passo === "chegada" ? "Registrei a chegada" : "Registrei a saída"}
          </Botao>
        </div>
      ) : null}
    </section>
  );
}
