import type { Metadata } from "next";
import Link from "next/link";
import { LockKeyhole } from "lucide-react";
import { Card, CardBody, CardHead, tabelaMock } from "@/components/mockup";
import { CabecalhoTela } from "@/components/shell/cabecalho-tela";
import { Botao } from "@/components/ui/botao";
import { FaixaAlerta } from "@/components/ui/faixa-alerta";
import { Selo } from "@/components/ui/selo";
import { TabelaLista } from "@/components/ui/tabela-lista";
import { exigeMfa } from "@/lib/auth/papeis";
import { exigirSessao } from "@/lib/auth/sessao";
import { ErroRepositorio } from "@/lib/dados/erros";
import { obterRepositorios } from "@/lib/dados/fabrica";
import type {
  ListaParceiros,
  RelatorioIndicacoes,
} from "@/lib/dados/tipos-relacao";
import { formatarData } from "@/lib/formatacao";
import { cn } from "@/lib/utils";
import { PainelParceiros } from "@/modules/parceiros/componentes/painel-parceiros";
import { FaixaIndicacoes } from "@/modules/relacao/componentes/faixa-indicacoes";
import {
  ROTULO_ESPECIALIDADE,
  ROTULO_ESTADO_PARCEIRO,
} from "@/modules/relacao/rotulos";

export const metadata: Metadata = { title: "Parceiros médicos · Kraamzorg OS" };

/**
 * Parceiros médicos e indicações (P50): relacionamento institucional, nunca
 * comissão. O aviso sobre a vedação ética fica sempre no topo. Cadastro do
 * médico, contato e tarefas de relacionamento, registro de indicação (de
 * médico ou de família promotora) e o relatório por médico.
 */
export default async function PaginaParceiros() {
  const usuario = await exigirSessao("/parceiros");
  const semMfa = exigeMfa(usuario.papeis) && usuario.aal !== "aal2";

  let lista: ListaParceiros | null = null;
  let relatorio: RelatorioIndicacoes | null = null;
  let familias: { id: string; nome: string }[] = [];
  let falhou = false;
  if (!semMfa) {
    try {
      const repos = await obterRepositorios();
      [lista, relatorio] = await Promise.all([
        repos.relacao.parceiros.listar(),
        repos.relacao.parceiros.relatorio({}),
      ]);
      familias = (await repos.familias.listarFamilias({ limite: 200 })).map(
        (f) => ({ id: f.id, nome: f.nome }),
      );
    } catch (erro) {
      falhou = !(
        erro instanceof ErroRepositorio && erro.codigo === "sem_permissao"
      );
    }
  }

  return (
    <>
      <CabecalhoTela
        titulo="Parceiros médicos"
        subtitulo="Os médicos que conhecem a Kraamzorg, as indicações que chegaram e o contato combinado com cada um."
      />
      <div className="flex flex-col gap-10 pt-6">
        {semMfa ? (
          <div className="rounded-3 bg-superficie shadow-1 flex max-w-[560px] flex-col gap-3 p-5">
            <p className="text-corpo text-texto flex items-start gap-3">
              <LockKeyhole
                className="text-texto-2 mt-1 size-4 shrink-0"
                aria-hidden="true"
                strokeWidth={1.75}
              />
              Esta tela cruza médicos e famílias, por isso pede o código do
              aplicativo de verificação antes de abrir.
            </p>
            <Botao
              asChild
              variante="secundario"
              tamanho="compacto"
              className="self-start"
            >
              <Link
                href={`${usuario.aalPossivel === "aal2" ? "/mfa/desafio" : "/mfa/cadastro"}?proximo=${encodeURIComponent("/parceiros")}`}
              >
                Confirmar com o código
              </Link>
            </Botao>
          </div>
        ) : falhou || !lista ? (
          <FaixaAlerta
            variante={falhou ? "erro" : "info"}
            titulo={
              falhou
                ? "Os parceiros não abriram agora"
                : "Os parceiros não fazem parte da sua função"
            }
          >
            {falhou
              ? "Confira a conexão e recarregue a página. Nada foi alterado."
              : "Parceiros médicos e indicações são do comercial e da diretoria."}
          </FaixaAlerta>
        ) : (
          <>
            <FaixaIndicacoes lista={lista} relatorio={relatorio} />
            <Card>
              <CardHead titulo="Parceiros médicos" direita="relacionamento" />
              {lista.parceiros.length === 0 ? (
                <CardBody>
                  <p className="text-corpo text-texto-2">
                    Nenhum médico parceiro ainda. Cadastre o primeiro logo
                    abaixo.
                  </p>
                </CardBody>
              ) : (
                <div className="overflow-x-auto">
                  <table className={tabelaMock.tabela}>
                    <caption className="sr-only">
                      Médicos parceiros, com indicações e contratos
                    </caption>
                    <thead>
                      <tr>
                        {[
                          "Profissional",
                          "Especialidade",
                          "Clínica",
                          "Relacionamento",
                          "Indicações",
                          "Contratos",
                          "Último contato",
                        ].map((c) => (
                          <th key={c} scope="col" className={tabelaMock.th}>
                            {c}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {[...lista.parceiros]
                        .sort(
                          (x, y) =>
                            y.indicacoes - x.indicacoes ||
                            x.nome.localeCompare(y.nome, "pt-BR"),
                        )
                        .map((m) => (
                          <tr key={m.medicoId} className={tabelaMock.tr}>
                            <td className={cn(tabelaMock.td, tabelaMock.nome)}>
                              {m.nome}
                            </td>
                            <td className={cn(tabelaMock.td, tabelaMock.sub)}>
                              {ROTULO_ESPECIALIDADE[m.especialidade]}
                            </td>
                            <td className={cn(tabelaMock.td, tabelaMock.sub)}>
                              {m.hospital ?? "Sem clínica informada"}
                            </td>
                            <td className={tabelaMock.td}>
                              <Selo
                                variante={
                                  m.estado === "ativo"
                                    ? "sucesso"
                                    : m.estado === "prospeccao"
                                      ? "neutro"
                                      : "aviso"
                                }
                              >
                                {ROTULO_ESTADO_PARCEIRO[m.estado]}
                              </Selo>
                            </td>
                            <td className={cn(tabelaMock.td, "font-mono")}>
                              {m.indicacoes}
                            </td>
                            <td className={cn(tabelaMock.td, "font-mono")}>
                              {m.contratos}
                            </td>
                            <td className={cn(tabelaMock.td, "font-mono")}>
                              {m.ultimoContatoEm
                                ? formatarData(m.ultimoContatoEm)
                                : "Sem contato"}
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Card>
            <PainelParceiros parceiros={lista.parceiros} familias={familias} />
            {relatorio && relatorio.porPromotora.length > 0 ? (
              <Card>
                <CardHead
                  titulo="Por família que indicou"
                  direita="as mesmas indicações entram na origem do marketing"
                />
                <div className="overflow-x-auto">
                  <TabelaLista
                    rotulo="Indicações por família promotora"
                    colunas={[
                      { chave: "nome", rotulo: "Família", principal: true },
                      {
                        chave: "indicacoes",
                        rotulo: "Indicações",
                        numerica: true,
                      },
                      {
                        chave: "contratos",
                        rotulo: "Viraram contrato",
                        numerica: true,
                      },
                    ]}
                    linhas={relatorio.porPromotora.map((f) => ({
                      id: f.familiaId,
                      valores: {
                        nome: f.nomeExibicao,
                        indicacoes: String(f.indicacoes),
                        contratos: String(f.contratos),
                      },
                    }))}
                  />
                </div>
              </Card>
            ) : null}
          </>
        )}
      </div>
    </>
  );
}
