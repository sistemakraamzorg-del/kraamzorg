import type { Metadata } from "next";
import Link from "next/link";
import { FilePlus, Route } from "lucide-react";
import { BarrasHorizontais } from "@/components/graficos";
import {
  Barra,
  Card,
  CardBody,
  Eyebrow,
  Nota,
  tabelaMock,
  TituloSecao,
} from "@/components/mockup";
import { Broto } from "@/components/ilustracoes";
import { CabecalhoTela } from "@/components/shell/cabecalho-tela";
import { EstadoVazio } from "@/components/ui/estado-vazio";
import { FaixaAlerta } from "@/components/ui/faixa-alerta";
import { Selo } from "@/components/ui/selo";
import { exigirSessao } from "@/lib/auth/sessao";
import { obterRepositorios } from "@/lib/dados/fabrica";
import type { ResumoManual, Trilha } from "@/lib/dados/tipos-relacao";
import { formatarData } from "@/lib/formatacao";
import { FormularioManual } from "@/modules/manuais/componentes/form-manual";
import { FormularioTrilha } from "@/modules/manuais/componentes/form-trilha";
import { ROTULO_PAPEL_ALVO } from "@/modules/relacao/rotulos";

export const metadata: Metadata = {
  title: "Manuais e protocolos · Kraamzorg OS",
};

/**
 * Manuais e protocolos (P51 item 2): a lista do que o seu papel precisa ler,
 * com a versão vigente e a confirmação de leitura. Coordenação e diretoria
 * também cadastram, versionam e montam as trilhas de treinamento.
 */
export default async function PaginaManuais() {
  const usuario = await exigirSessao("/manuais");
  const gestao = usuario.papeis.some(
    (p) => p === "coordenacao" || p === "diretoria",
  );

  let manuais: ResumoManual[] = [];
  let trilhas: Trilha[] = [];
  let falhou = false;
  try {
    const { relacao } = await obterRepositorios();
    manuais = await relacao.manuais.listar();
    if (gestao) trilhas = await relacao.manuais.trilhas();
  } catch {
    falhou = true;
  }

  const lidos = manuais.filter((m) => m.lido).length;
  // Andamento de cada pessoa somando todas as trilhas ativas (só a gestão vê).
  const porPessoa = new Map<
    string,
    { nome: string; feitos: number; total: number }
  >();
  for (const t of trilhas)
    for (const p of t.equipe ?? []) {
      const atual = porPessoa.get(p.usuarioId) ?? {
        nome: p.nome,
        feitos: 0,
        total: 0,
      };
      atual.feitos += p.feitos;
      atual.total += p.total;
      porPessoa.set(p.usuarioId, atual);
    }
  const andamento = [...porPessoa.values()]
    .filter((p) => p.total > 0)
    .map((p) => ({
      rotulo: p.nome,
      valor: Math.round((p.feitos / p.total) * 100),
      tom: (p.feitos === p.total
        ? "sucesso"
        : p.feitos / p.total < 0.5
          ? "alerta"
          : "aviso") as "sucesso" | "alerta" | "aviso",
    }));
  const comConfirmacoes = manuais
    .filter((m) => m.confirmacoes !== null)
    .map((m) => ({
      rotulo: `${m.titulo} v${m.versao}`,
      valor: m.confirmacoes ?? 0,
      tom: "sucesso" as const,
    }));

  return (
    <>
      <CabecalhoTela
        titulo="Manuais e protocolos"
        subtitulo="O que a sua função precisa ler, na versão de hoje. Quando um texto muda, a leitura pede uma nova confirmação."
      />
      <div className="flex flex-col gap-3.5 pt-3.5">
        {falhou ? (
          <FaixaAlerta variante="erro" titulo="Os manuais não abriram agora">
            Confira a conexão e recarregue a página. Nada foi alterado.
          </FaixaAlerta>
        ) : manuais.length === 0 ? (
          <EstadoVazio
            nivelTitulo="h2"
            ilustracao={<Broto tamanho={104} />}
            titulo="Nenhum manual para você ainda"
            texto={
              gestao
                ? "Cadastre o primeiro manual abaixo e marque quem precisa ler."
                : "Quando a coordenação publicar um manual para a sua função, ele aparece aqui."
            }
          />
        ) : (
          <>
            <div
              data-tour="/manuais:leitura"
              className="grid grid-cols-1 gap-3.5 lg:grid-cols-2"
            >
              <Card>
                <CardBody>
                  <div className="mb-3 flex items-baseline gap-[9px]">
                    <b className="text-[13px] font-semibold">
                      {gestao && andamento.length > 0
                        ? "Conclusão da trilha obrigatória"
                        : "Sua leitura"}
                    </b>
                    <span className="text-tinta-50 text-[11px]">
                      {gestao && andamento.length > 0
                        ? "por profissional"
                        : "na versão de hoje"}
                    </span>
                  </div>
                  {gestao && andamento.length > 0 ? (
                    <BarrasHorizontais
                      rotulo="Conclusão da trilha por profissional"
                      larguraRotulo="7rem"
                      formato="percentual"
                      itens={andamento}
                    />
                  ) : (
                    <div className="flex flex-col gap-2">
                      <Barra
                        valor={(lidos / manuais.length) * 100}
                        tom="sucesso"
                        rotulo="Manuais com a leitura confirmada"
                      />
                      <p className="text-tinta-50 text-[12.5px]">
                        {lidos === manuais.length
                          ? "Tudo lido na versão de hoje"
                          : `${lidos} de ${manuais.length} com a leitura confirmada`}
                      </p>
                    </div>
                  )}
                </CardBody>
              </Card>
              <Card>
                <CardBody>
                  <div className="mb-3 flex items-baseline gap-[9px]">
                    <b className="text-[13px] font-semibold">
                      Leituras confirmadas
                    </b>
                    <span className="text-tinta-50 text-[11px]">
                      por manual, na versão vigente
                    </span>
                  </div>
                  {gestao && comConfirmacoes.length > 0 ? (
                    <BarrasHorizontais
                      rotulo="Leituras confirmadas por manual"
                      larguraRotulo="9rem"
                      itens={comConfirmacoes}
                    />
                  ) : (
                    <p className="text-tinta-50 text-[12.5px]">
                      A contagem de quem já leu cada manual aparece para a
                      coordenação e a diretoria.
                    </p>
                  )}
                </CardBody>
              </Card>
            </div>

            <TituloSecao className="mt-[11px]">Manuais da equipe</TituloSecao>
            <ul
              data-tour="/manuais:lista"
              className="grid grid-cols-1 items-start gap-3.5 lg:grid-cols-3"
            >
              {manuais.map((m) => (
                <li key={m.id} data-manual={m.titulo}>
                  <Card className="h-full">
                    <CardBody>
                      <Eyebrow>
                        {m.categoria === "protocolo" ? "Protocolo" : "Manual"}
                      </Eyebrow>
                      <Link
                        href={`/manuais/${m.id}`}
                        className="font-titulo mt-1.5 mb-[9px] block text-[17px] font-normal underline-offset-4 hover:underline"
                      >
                        {m.titulo}
                      </Link>
                      <p className="text-tinta-50 mb-[11px] text-[11.5px]">
                        Versão {m.versao}, publicada em{" "}
                        {formatarData(m.publicadaEm)}.
                        {m.papeisAlvo.length > 0
                          ? ` Para: ${m.papeisAlvo.map((p) => ROTULO_PAPEL_ALVO[p] ?? p).join(", ")}.`
                          : ""}
                      </p>
                      <div className="flex flex-wrap items-center gap-[5px]">
                        {!m.ativo ? (
                          <Selo variante="contorno">Fora de uso</Selo>
                        ) : null}
                        {m.confirmacoes !== null ? (
                          <Selo variante="neutro">
                            {m.confirmacoes}{" "}
                            {m.confirmacoes === 1
                              ? "confirmação"
                              : "confirmações"}
                          </Selo>
                        ) : null}
                        <Selo variante={m.lido ? "sucesso" : "aviso"}>
                          {m.lido ? "Lido" : "Falta confirmar a leitura"}
                        </Selo>
                      </div>
                    </CardBody>
                  </Card>
                </li>
              ))}
            </ul>
          </>
        )}

        {gestao && !falhou ? (
          <>
            <TituloSecao className="mt-[11px]" id="trilhas">
              Trilhas de treinamento
            </TituloSecao>
            {trilhas.length === 0 ? (
              <Card>
                <CardBody>
                  <p className="text-tinta-50 text-[12.5px]">
                    Nenhuma trilha ainda. Monte a primeira abaixo.
                  </p>
                </CardBody>
              </Card>
            ) : (
              <Card className="overflow-x-auto">
                <table className={`${tabelaMock.tabela} min-w-[34rem]`}>
                  <thead>
                    <tr>
                      <th className={tabelaMock.th}>Trilha</th>
                      <th className={tabelaMock.th}>Cargo</th>
                      <th className={tabelaMock.th}>Módulos</th>
                      <th className={tabelaMock.th}>Conclusão</th>
                      <th className={tabelaMock.th}>Situação</th>
                    </tr>
                  </thead>
                  <tbody>
                    {trilhas.map((t) => {
                      const eq = t.equipe ?? [];
                      const feitos = eq.reduce((a, p) => a + p.feitos, 0);
                      const total = eq.reduce((a, p) => a + p.total, 0);
                      const pct = total > 0 ? (feitos / total) * 100 : 0;
                      return (
                        <tr key={t.id} className={tabelaMock.tr}>
                          <td className={`${tabelaMock.td} ${tabelaMock.nome}`}>
                            {t.nome}
                            <div className={`${tabelaMock.sub} font-normal`}>
                              {t.itens.map((i) => i.titulo).join(", ") ||
                                "Sem manuais"}
                            </div>
                          </td>
                          <td className={`${tabelaMock.td} text-tinta-70`}>
                            {ROTULO_PAPEL_ALVO[t.papelAlvo] ?? t.papelAlvo}
                          </td>
                          <td className={`${tabelaMock.td} font-mono`}>
                            {t.itens.length}
                          </td>
                          <td className={`${tabelaMock.td} min-w-[110px]`}>
                            {total > 0 ? (
                              <Barra
                                valor={pct}
                                tom={
                                  pct >= 100
                                    ? "sucesso"
                                    : pct < 50
                                      ? "alerta"
                                      : "aviso"
                                }
                                rotulo={`Conclusão da trilha ${t.nome}`}
                              />
                            ) : (
                              <span className={tabelaMock.sub}>Sem equipe</span>
                            )}
                          </td>
                          <td className={tabelaMock.td}>
                            <Selo
                              variante={
                                !t.ativa
                                  ? "contorno"
                                  : total > 0 && pct >= 100
                                    ? "sucesso"
                                    : "aviso"
                              }
                            >
                              {!t.ativa
                                ? "Fora de uso"
                                : total > 0 && pct >= 100
                                  ? "Completa"
                                  : "Em curso"}
                            </Selo>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </Card>
            )}

            <div className="grid grid-cols-1 items-start gap-3.5 lg:grid-cols-2">
              <section
                aria-labelledby="novo"
                className="flex min-w-0 flex-col gap-3"
              >
                <h2
                  id="novo"
                  className="font-titulo flex items-center gap-3 text-[19px] font-light"
                >
                  <FilePlus
                    aria-hidden="true"
                    className="text-dourado size-5"
                    strokeWidth={1.75}
                  />
                  Cadastrar
                </h2>
                <FormularioManual />
              </section>
              <section
                aria-labelledby="montar-trilha"
                className="flex min-w-0 flex-col gap-3"
              >
                <h2
                  id="montar-trilha"
                  className="font-titulo flex items-center gap-3 text-[19px] font-light"
                >
                  <Route
                    aria-hidden="true"
                    className="text-dourado size-5"
                    strokeWidth={1.75}
                  />
                  Montar trilha
                </h2>
                <FormularioTrilha manuais={manuais} />
              </section>
            </div>

            <Nota>
              <b>Versão e aceite andam juntos.</b> Publicar uma nova versão de
              um protocolo derruba o aceite da anterior e recoloca a pessoa como
              pendente. Assim, &ldquo;todo mundo leu&rdquo; sempre tem lastro.
            </Nota>
          </>
        ) : null}
      </div>
    </>
  );
}
