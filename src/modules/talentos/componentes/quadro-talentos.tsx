"use client";

import * as React from "react";
import Link from "next/link";
import { FolhaLupa } from "@/components/ilustracoes";
import { EstadoVazio } from "@/components/ui/estado-vazio";
import type { EstadoCandidata } from "@/lib/dados/tipos-relacao";
import { type ResumoCandidata } from "@/lib/dados/tipos-relacao";
import { formatarData } from "@/lib/formatacao";
import { cn } from "@/lib/utils";
import { Avatar } from "@/modules/relacao/componentes/faixa-resumo";
import { ROTULO_ESTADO_CANDIDATA } from "@/modules/relacao/rotulos";

/**
 * Funil das candidatas: uma coluna por etapa, altura máxima com rolagem
 * interna, busca e filtro por cidade no cliente (a lista já vem inteira).
 * Mudar a etapa continua na ficha da candidata.
 */
const ORDEM: EstadoCandidata[] = [
  "nova",
  "em_triagem",
  "entrevista_agendada",
  "entrevistada",
  "aprovada",
  "banco_reserva",
  "nao_seguiu",
  "desistiu",
];

const PONTO: Record<EstadoCandidata, string> = {
  nova: "bg-dourado",
  em_triagem: "bg-marinho-50",
  entrevista_agendada: "bg-aviso",
  entrevistada: "bg-marinho",
  aprovada: "bg-sucesso",
  banco_reserva: "bg-areia",
  nao_seguiu: "bg-marinho-50",
  desistiu: "bg-marinho-50",
};

const normalizar = (t: string) =>
  t.normalize("NFD").replace(/[̀-ͯ]/g, "").toLocaleLowerCase("pt-BR");

export function QuadroTalentos({
  candidatas,
}: {
  candidatas: ResumoCandidata[];
}) {
  const [busca, definirBusca] = React.useState("");
  const [cidade, definirCidade] = React.useState("");
  const cidades = Array.from(
    new Set(candidatas.map((c) => c.cidade).filter((c): c is string => !!c)),
  ).sort((a, b) => a.localeCompare(b, "pt-BR"));
  const termo = normalizar(busca.trim());
  const visiveis = candidatas.filter(
    (c) =>
      (cidade === "" || c.cidade === cidade) &&
      (termo === "" || normalizar(c.nome).includes(termo)),
  );

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end gap-3">
        <label className="flex min-w-[220px] flex-1 flex-col gap-1.5 sm:max-w-[360px]">
          <span className="text-apoio text-texto font-semibold">
            Buscar candidata
          </span>
          <input
            type="search"
            value={busca}
            onChange={(e) => definirBusca(e.target.value)}
            placeholder="Digite um nome"
            autoComplete="off"
            className="rounded-2 border-borda-campo bg-superficie text-corpo text-texto min-h-toque w-full border-[1.5px] px-4"
          />
        </label>
        <label className="flex min-w-[180px] flex-col gap-1.5">
          <span className="text-apoio text-texto font-semibold">Cidade</span>
          <select
            value={cidade}
            onChange={(e) => definirCidade(e.target.value)}
            className="rounded-2 border-borda-campo bg-superficie text-corpo text-texto min-h-toque w-full border-[1.5px] px-3"
          >
            <option value="">Todas as cidades</option>
            {cidades.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </label>
        <p className="text-apoio text-texto-2 min-h-toque flex items-center">
          {visiveis.length === candidatas.length
            ? `${candidatas.length} ${candidatas.length === 1 ? "candidata" : "candidatas"}`
            : `${visiveis.length} de ${candidatas.length} candidatas`}
        </p>
      </div>

      {visiveis.length === 0 ? (
        <EstadoVazio
          nivelTitulo="h3"
          variante="tracejado"
          ilustracao={<FolhaLupa tamanho={88} />}
          titulo="Nenhuma candidata encontrada"
          texto="Confira a grafia do nome ou escolha Todas as cidades para ver o funil completo."
        />
      ) : (
        <div className="-mx-4 flex snap-x snap-mandatory items-start gap-3 overflow-x-auto px-4 pb-1 lg:mx-0 lg:px-0">
          {ORDEM.map((estado) => {
            const cartoes = visiveis.filter((c) => c.estado === estado);
            return (
              <section
                key={estado}
                aria-labelledby={`etapa-${estado}`}
                className="rounded-3 border-linha bg-areia-clara flex max-h-[65dvh] w-[16.5rem] flex-none snap-start flex-col gap-2 border p-2 lg:w-[17.5rem]"
              >
                <div className="flex min-h-9 flex-none items-center gap-2 pl-1">
                  <span
                    aria-hidden="true"
                    className={cn(
                      "size-2.5 flex-none rounded-full",
                      PONTO[estado],
                    )}
                  />
                  <h3
                    id={`etapa-${estado}`}
                    className="font-titulo text-3 min-w-0 flex-1 truncate font-medium"
                  >
                    {ROTULO_ESTADO_CANDIDATA[estado]}
                  </h3>
                  <span className="rounded-pilula bg-superficie text-apoio border-linha inline-flex min-h-8 min-w-8 items-center justify-center border px-2 font-mono font-medium">
                    {cartoes.length}
                  </span>
                </div>
                {cartoes.length === 0 ? (
                  <p className="text-apoio text-texto-2 px-2 pb-2">
                    Nenhuma candidata nesta etapa.
                  </p>
                ) : (
                  <ul className="flex min-h-0 flex-col gap-2 overflow-y-auto overscroll-contain pr-0.5">
                    {cartoes.map((c) => (
                      <li key={c.id}>
                        <Link
                          href={`/talentos/${c.id}`}
                          className="rounded-2 border-linha bg-superficie hover:border-dourado focus-visible:border-dourado flex min-h-[44px] items-start gap-3 border p-3 text-inherit no-underline transition-colors"
                        >
                          <Avatar nome={c.nome} />
                          <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                            <span className="text-corpo text-texto truncate font-semibold">
                              {c.nome}
                            </span>
                            <span className="text-apoio text-texto-2 truncate">
                              {c.cidade ?? "Cidade não informada"}
                            </span>
                            <span className="text-apoio text-texto-2">
                              Chegou em{" "}
                              <span className="font-mono">
                                {formatarData(c.criadoEm)}
                              </span>
                            </span>
                            <span className="text-apoio text-texto-2">
                              {c.avaliacoes === 0
                                ? "Sem entrevista"
                                : `${c.avaliacoes} ${c.avaliacoes === 1 ? "entrevista" : "entrevistas"}${c.mediaGeral !== null ? `, média ${c.mediaGeral.toFixed(1).replace(".", ",")}` : ""}`}
                            </span>
                          </span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}
