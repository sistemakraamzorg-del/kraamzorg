"use client";

import * as React from "react";
import { Check, Clock, Users } from "lucide-react";
import { Botao } from "@/components/ui/botao";
import { CartaoResumo } from "@/components/ui/cartao-resumo";
import { EstadoVazio } from "@/components/ui/estado-vazio";
import { Selo } from "@/components/ui/selo";
import type {
  FamiliaAcessoPortal,
  PessoaAcessoPortal,
} from "@/lib/dados/tipos-relacao";
import { formatarDataHora } from "@/lib/formatacao";
import { cn } from "@/lib/utils";
import { ROTULO_PAPEL_PESSOA } from "@/modules/crm/pipeline/estagios";
import { acaoLiberarAcesso, acaoSuspenderAcesso } from "../acoes";

/**
 * Quem da família entra no portal (P49). Uma ação por pessoa: liberar cria
 * a tarefa do convite (que respeita o freio), suspender fecha na hora.
 * Família em estado sensível não recebe convite; a tela diz por quê.
 * Resumo no topo, busca e filtro no cliente (a lista já vem inteira).
 */
type Filtro = "todas" | "com_acesso" | "falta";

const FILTROS: { id: Filtro; rotulo: string }[] = [
  { id: "todas", rotulo: "Todas" },
  { id: "com_acesso", rotulo: "Com acesso" },
  { id: "falta", rotulo: "Falta liberar" },
];

const temAcesso = (f: FamiliaAcessoPortal) =>
  f.pessoas.some((p) => p.situacao === "liberado");

function iniciais(nome: string) {
  const partes = nome.trim().split(/\s+/).filter(Boolean);
  const duas = [partes[0], partes.length > 1 ? partes[partes.length - 1] : ""];
  return duas
    .map((x) => (x ? Array.from(x)[0] : ""))
    .join("")
    .toLocaleUpperCase("pt-BR");
}

const normalizar = (t: string) =>
  t
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("pt-BR");

function SeloAcesso({ p }: { p: PessoaAcessoPortal }) {
  if (p.situacao === "liberado" && p.entrou)
    return <Selo variante="sucesso">Já entra no portal</Selo>;
  if (p.situacao === "liberado")
    return <Selo variante="neutro">Convite enviado</Selo>;
  if (p.situacao === "suspenso")
    return <Selo variante="alerta">Acesso suspenso</Selo>;
  return <Selo variante="aviso">Falta liberar</Selo>;
}

export function ListaAcessos({
  familias,
}: {
  familias: FamiliaAcessoPortal[];
}) {
  const [aviso, definirAviso] = React.useState<{
    erro?: string;
    sucesso?: string;
  }>({});
  const [ocupada, iniciar] = React.useTransition();
  const [busca, definirBusca] = React.useState("");
  const [filtro, definirFiltro] = React.useState<Filtro>("todas");

  function agir(
    acao: (id: string) => Promise<{ erro?: string; sucesso?: string }>,
    pessoaId: string,
  ) {
    iniciar(async () => {
      definirAviso(await acao(pessoaId));
    });
  }

  if (familias.length === 0) {
    return (
      <EstadoVazio
        nivelTitulo="h3"
        titulo="Nenhuma família para liberar ainda"
        texto="As famílias aparecem aqui quando o contrato é assinado. Então você libera o portal pessoa por pessoa, e a família recebe um convite por e-mail."
      />
    );
  }

  const comAcesso = familias.filter(temAcesso).length;
  const falta = familias.length - comAcesso;
  const jaEntraram = familias.reduce(
    (n, f) => n + f.pessoas.filter((p) => p.entrou).length,
    0,
  );
  const termo = normalizar(busca.trim());
  const visiveis = familias.filter(
    (f) =>
      (filtro === "todas" ||
        (filtro === "com_acesso" ? temAcesso(f) : !temAcesso(f))) &&
      (termo === "" ||
        normalizar(f.nomeExibicao).includes(termo) ||
        f.pessoas.some((p) => normalizar(p.primeiroNome).includes(termo))),
  );

  return (
    <div className="flex flex-col gap-5">
      <div className="tablet:grid-cols-3 grid grid-cols-1 gap-3">
        <CartaoResumo
          tom="salvia"
          fundo="tom"
          arranjo="linha"
          icone={<Check />}
          valor={comAcesso}
          rotulo="famílias com acesso liberado"
          contexto={`de ${familias.length} com contrato`}
        />
        <CartaoResumo
          tom="areia"
          fundo="tom"
          arranjo="linha"
          icone={<Clock />}
          valor={falta}
          rotulo="famílias aguardando liberação"
          contexto={
            falta === 0
              ? "Nenhuma pendente"
              : "Ninguém liberado ainda nessas famílias"
          }
        />
        <CartaoResumo
          tom="lavanda"
          fundo="tom"
          arranjo="linha"
          icone={<Users />}
          valor={jaEntraram}
          rotulo={jaEntraram === 1 ? "pessoa já entrou" : "pessoas já entraram"}
          contexto="Quem abriu o portal ao menos uma vez"
        />
      </div>

      <div className="flex flex-col gap-3">
        <label className="flex flex-col gap-1.5">
          <span className="text-apoio text-texto font-semibold">
            Buscar família ou pessoa
          </span>
          <input
            type="search"
            value={busca}
            onChange={(e) => definirBusca(e.target.value)}
            placeholder="Digite um nome"
            autoComplete="off"
            className="rounded-2 border-borda-campo bg-superficie text-corpo text-texto min-h-toque w-full max-w-[420px] border-[1.5px] px-4"
          />
        </label>
        <div
          role="group"
          aria-label="Filtrar famílias"
          className="flex flex-wrap gap-2"
        >
          {FILTROS.map((x) => (
            <button
              key={x.id}
              type="button"
              aria-pressed={filtro === x.id}
              onClick={() => definirFiltro(x.id)}
              className={cn(
                "rounded-pilula min-h-toque text-apoio inline-flex items-center px-4 font-semibold",
                filtro === x.id
                  ? "bg-marinho text-texto-inverso"
                  : "border-borda-campo bg-superficie text-texto hover:bg-marinho-08 border-[1.5px]",
              )}
            >
              {x.rotulo}
            </button>
          ))}
        </div>
      </div>

      <p
        role="status"
        aria-live="polite"
        className="text-corpo text-texto min-h-6"
        data-teste="aviso-acesso"
      >
        {aviso.erro ?? aviso.sucesso ?? ""}
      </p>

      {visiveis.length === 0 ? (
        <EstadoVazio
          variante="tracejado"
          titulo="Nenhuma família encontrada"
          texto="Confira a grafia do nome ou volte para o filtro Todas para ver a lista completa."
          acao={
            <Botao
              type="button"
              variante="secundario"
              tamanho="compacto"
              onClick={() => {
                definirBusca("");
                definirFiltro("todas");
              }}
            >
              Limpar busca e filtro
            </Botao>
          }
        />
      ) : (
        <ul className="flex flex-col gap-4">
          {visiveis.map((f) => {
            const sensivel =
              f.estadoSensivel === "bloqueio_total" ||
              f.estadoSensivel === "encerrado_sensivel";
            return (
              <li
                key={f.familiaId}
                className="rounded-3 bg-superficie border-linha flex flex-col border"
                data-familia={f.nomeExibicao}
              >
                <div className="bg-areia-clara rounded-t-3 flex items-center gap-3 px-5 py-4">
                  <span
                    aria-hidden="true"
                    className="bg-areia text-texto font-titulo text-3 flex size-11 shrink-0 items-center justify-center rounded-full font-medium"
                  >
                    {iniciais(f.nomeExibicao)}
                  </span>
                  <h3 className="font-titulo text-2 text-texto min-w-0 font-medium">
                    {f.nomeExibicao}
                  </h3>
                </div>
                {sensivel ? (
                  <p className="text-corpo text-texto-2 max-w-[56ch] px-5 pt-4">
                    Esta família está em um momento sensível. Nenhum convite
                    sai; quem entrar no portal vê só o contato de uma pessoa da
                    equipe.
                  </p>
                ) : null}
                <ul className="flex flex-col px-5 pb-2">
                  {f.pessoas.map((p) => (
                    <li
                      key={p.pessoaId}
                      className="border-linha flex flex-wrap items-center gap-x-3 gap-y-2 border-t py-3 first:border-t-0"
                    >
                      <span className="flex min-w-[9rem] flex-col">
                        <span className="text-corpo text-texto font-semibold">
                          {p.primeiroNome}
                        </span>
                        <span className="text-apoio text-texto-2">
                          {ROTULO_PAPEL_PESSOA[
                            p.papel as keyof typeof ROTULO_PAPEL_PESSOA
                          ] ?? p.papel}
                        </span>
                      </span>
                      <SeloAcesso p={p} />
                      <span className="text-apoio text-texto-2 min-w-0 flex-1">
                        {p.situacao === "liberado"
                          ? p.entrou && p.ultimoAcessoEm
                            ? `Último acesso em ${formatarDataHora(p.ultimoAcessoEm)}`
                            : "Ainda não entrou"
                          : p.situacao === "suspenso"
                            ? "Não entra até você liberar de novo."
                            : !p.temEmail
                              ? "Sem e-mail no cadastro: complete a ficha para poder liberar."
                              : "Liberar envia o convite por e-mail."}
                        {p.situacao !== "sem_acesso" && !p.temEmail
                          ? " Sem e-mail no cadastro."
                          : ""}
                      </span>
                      <span className="ml-auto flex gap-2">
                        {p.situacao === "liberado" ? (
                          <Botao
                            type="button"
                            variante="secundario"
                            tamanho="compacto"
                            disabled={ocupada}
                            aria-label={`Suspender o acesso de ${p.primeiroNome}`}
                            onClick={() =>
                              agir(acaoSuspenderAcesso, p.pessoaId)
                            }
                          >
                            Suspender
                          </Botao>
                        ) : (
                          <Botao
                            type="button"
                            variante="primario"
                            tamanho="compacto"
                            disabled={ocupada || !p.temEmail || sensivel}
                            aria-label={`Liberar o portal para ${p.primeiroNome}`}
                            onClick={() => agir(acaoLiberarAcesso, p.pessoaId)}
                          >
                            {p.situacao === "suspenso"
                              ? "Liberar de novo"
                              : "Liberar o portal"}
                          </Botao>
                        )}
                      </span>
                    </li>
                  ))}
                </ul>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
