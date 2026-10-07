import type { Metadata } from "next";
import { z } from "zod";
import Link from "next/link";
import { CalendarDays, Plus } from "lucide-react";
import { CabecalhoTela } from "@/components/shell/cabecalho-tela";
import { ChaveDeCasa } from "@/components/ilustracoes";
import { AbasPilula } from "@/components/ui/abas-pilula";
import { Botao } from "@/components/ui/botao";
import {
  Barra,
  Card,
  CardBody,
  CardHead,
  Kpi,
  Nota,
  classesChip,
  tabelaMock,
} from "@/components/mockup";
import { BarrasHorizontais } from "@/components/graficos/barras-horizontais";
import { Selo } from "@/components/ui/selo";
import { EstadoVazio } from "@/components/ui/estado-vazio";
import { FaixaAlerta } from "@/components/ui/faixa-alerta";
import { exigirSessao } from "@/lib/auth/sessao";
import { formatarDecimal } from "@/lib/gestao/formato";
import { formatarData } from "@/lib/formatacao";
import type { LinhaEscala, ProfissionalEquipe } from "@/lib/dados/tipos-equipe";
import { cn } from "@/lib/utils";
import { Avatar } from "@/modules/operacao/equipe/componentes/avatar";
import { SeloEstadoProfissional } from "@/modules/operacao/equipe/componentes/selo-estado";
import {
  carregarEquipe,
  type EquipeTela,
} from "@/modules/operacao/equipe/dados";
import {
  ROTULO_FUNCAO,
  ROTULO_VINCULO,
  fraseSinteseEquipe,
} from "@/modules/operacao/equipe/textos";

export const metadata: Metadata = { title: "Equipe · Kraamzorg OS" };

type Pesquisa = Record<string, string | string[] | undefined>;

const um = (v: string | string[] | undefined) =>
  (Array.isArray(v) ? v[0] : v) ?? null;

/**
 * Equipe (P37, fluxo C): como está cada enfermeira hoje e a semana dela em
 * turnos, com o estado sempre calculado das designações, das visitas e dos
 * bloqueios de agenda (nenhuma tela oferece marcar o estado à mão). Só
 * coordenação e diretoria. A frase de cima resume o dia.
 */
export default async function PaginaEquipe({
  searchParams,
}: {
  searchParams: Promise<Pesquisa>;
}) {
  await exigirSessao("/equipe");
  const pesquisa = await searchParams;
  const pracaPedida = um(pesquisa.praca);
  const regiaoId =
    pracaPedida && z.uuid().safeParse(pracaPedida).success ? pracaPedida : null;
  const inativas = um(pesquisa.inativas) === "1";

  let tela: EquipeTela | null = null;
  try {
    tela = await carregarEquipe({ regiaoId, incluirInativas: inativas });
  } catch (erro) {
    console.error(
      "[tela-erro] /equipe",
      erro instanceof Error ? erro.message : erro,
    );
    tela = null;
  }

  const acaoNova = (
    <Botao
      asChild
      tamanho="compacto"
      iconeEsquerda={<Plus aria-hidden="true" />}
    >
      <Link href="/equipe/nova" data-tour="/equipe:nova">
        Nova profissional
      </Link>
    </Botao>
  );

  if (!tela) {
    return (
      <>
        <CabecalhoTela titulo="Equipe" lateral={acaoNova} />
        <div className="pt-6">
          <FaixaAlerta variante="erro" titulo="A equipe não abriu agora">
            Nada foi alterado. Confira a conexão e recarregue a página; se
            continuar, avise a equipe técnica.
          </FaixaAlerta>
        </div>
      </>
    );
  }

  const { visao, regioes, linhasPorProfissional } = tela;
  const nomesRegioes = new Map(regioes.map((r) => [r.id, r.nome]));
  const querString = (extra: Record<string, string | null>) => {
    const partes = new URLSearchParams();
    const praca = "praca" in extra ? extra.praca : regiaoId;
    const ina = "inativas" in extra ? extra.inativas : inativas ? "1" : null;
    if (praca) partes.set("praca", praca);
    if (ina) partes.set("inativas", ina);
    const s = partes.toString();
    return s ? `/equipe?${s}` : "/equipe";
  };

  const profissionais = visao.profissionais;
  const ativas = profissionais.filter((p) => p.ativa);
  const fazemVisita = profissionais.filter((p) => p.atendeVisitas && p.ativa);
  const visitasSemana = fazemVisita.map((p) =>
    (linhasPorProfissional.get(p.id)?.dias ?? []).reduce(
      (t, d) => t + d.visitas,
      0,
    ),
  );
  const mediaVisitas =
    fazemVisita.length > 0
      ? visitasSemana.reduce((t, v) => t + v, 0) / fazemVisita.length
      : 0;
  const docsAtencao = profissionais.flatMap((p) =>
    p.documentos.filter(
      (d) => d.situacao === "vencido" || d.situacao === "vencendo",
    ),
  );
  const docsVencidos = docsAtencao.filter(
    (d) => d.situacao === "vencido",
  ).length;
  const carga = fazemVisita
    .map((p, i) => ({
      id: p.id,
      rotulo: p.nome,
      valor: visitasSemana[i] ?? 0,
      valorTexto:
        visitasSemana[i] === 1
          ? "1 visita"
          : `${visitasSemana[i] ?? 0} visitas`,
    }))
    .sort((a, b) => b.valor - a.valor);

  return (
    <>
      <CabecalhoTela
        titulo="Equipe"
        subtitulo={fraseSinteseEquipe(visao.resumo)}
        lateral={acaoNova}
      />

      <div className="flex flex-col gap-3.5 pt-6">
        <div className="grid grid-cols-2 gap-3.5 lg:grid-cols-4">
          <Kpi
            rotulo="Profissionais ativas"
            valor={ativas.length}
            delta={
              visao.resumo.ofertaPendente === 0
                ? "nenhuma oferta sem resposta"
                : visao.resumo.ofertaPendente === 1
                  ? "1 oferta sem resposta"
                  : `${visao.resumo.ofertaPendente} ofertas sem resposta`
            }
          />
          <Kpi
            rotulo="Visitas por profissional"
            valor={formatarDecimal(mediaVisitas)}
            delta="média na semana"
          />
          <Kpi
            rotulo="Documentos vencendo"
            valor={docsAtencao.length}
            tomDelta={docsVencidos > 0 ? "alerta" : "neutro"}
            delta={
              docsVencidos > 0
                ? docsVencidos === 1
                  ? "1 já vencido"
                  : `${docsVencidos} já vencidos`
                : "nenhum vencido"
            }
          />
          <Kpi
            rotulo="Avaliação média"
            valor={<span className="text-[18px]">Sem dado</span>}
            delta="ainda não disponível no sistema"
          />
        </div>

        <nav
          aria-label="Filtros da equipe"
          data-tour="/equipe:filtros"
          className="flex flex-wrap items-center gap-[9px]"
        >
          {regioes.length > 0 ? (
            <AbasPilula
              rotulo="Praça"
              ativa={regiaoId ?? ""}
              abas={[
                {
                  valor: "",
                  rotulo: "Todas as praças",
                  href: querString({ praca: null }),
                },
                ...regioes.map((r) => ({
                  valor: r.id,
                  rotulo: r.nome,
                  href: querString({ praca: r.id }),
                })),
              ]}
            />
          ) : null}
          <Link
            href={querString({ inativas: inativas ? null : "1" })}
            aria-current={inativas ? "true" : undefined}
            className={cn(
              classesChip(inativas),
              "min-h-toque justify-center no-underline lg:min-h-8",
            )}
          >
            Mostrar inativas
          </Link>
          <Link
            href="/equipe/escala"
            className={cn(
              classesChip(),
              "min-h-toque justify-center no-underline lg:min-h-8",
            )}
          >
            <CalendarDays aria-hidden="true" className="size-4" />
            Escala da semana
          </Link>
        </nav>

        {profissionais.length === 0 ? (
          <EstadoVazio
            nivelTitulo="h2"
            ilustracao={<ChaveDeCasa tamanho={112} />}
            titulo={
              regiaoId
                ? "Nenhuma profissional nesta praça"
                : "Nenhuma profissional cadastrada"
            }
            texto={
              regiaoId
                ? "Cadastre uma profissional nesta praça em Nova profissional. Quando ela estiver ativa, o estado dela aparece aqui."
                : "Cadastre a primeira em Nova profissional. O estado de cada uma aparece aqui, calculado das ofertas, das visitas e das folgas."
            }
            acao={
              <Botao asChild variante="secundario" tamanho="compacto">
                <Link href="/equipe/nova">Nova profissional</Link>
              </Botao>
            }
          />
        ) : (
          <Card data-tour="/equipe:tabela">
            <CardHead
              titulo="Equipe assistencial"
              direita={`${profissionais.length} ${profissionais.length === 1 ? "profissional" : "profissionais"}`}
            />
            <div
              role="region"
              aria-label="Equipe, role para os lados no celular"
              tabIndex={0}
              className="overflow-x-auto"
            >
              <table className={cn(tabelaMock.tabela, "min-w-[900px]")}>
                <caption className="sr-only">
                  Profissionais da equipe, com função, praça, vínculo, carga da
                  semana, documentos e situação.
                </caption>
                <thead>
                  <tr>
                    <th scope="col" className={tabelaMock.th}>
                      Profissional
                    </th>
                    <th scope="col" className={tabelaMock.th}>
                      Função
                    </th>
                    <th scope="col" className={tabelaMock.th}>
                      Praça
                    </th>
                    <th scope="col" className={tabelaMock.th}>
                      Vínculo
                    </th>
                    <th scope="col" className={tabelaMock.th}>
                      Carga da semana
                    </th>
                    <th scope="col" className={tabelaMock.th}>
                      Documentos
                    </th>
                    <th scope="col" className={tabelaMock.th}>
                      Avaliação
                    </th>
                    <th scope="col" className={cn(tabelaMock.th, "w-[114px]")}>
                      Situação
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {profissionais.map((p) => (
                    <LinhaProfissional
                      key={p.id}
                      p={p}
                      linha={linhasPorProfissional.get(p.id) ?? null}
                      pracas={p.regioes
                        .map((r) => nomesRegioes.get(r))
                        .filter((x): x is string => Boolean(x))}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        )}

        <div className="grid grid-cols-1 gap-3.5 lg:grid-cols-3">
          <Card>
            <CardBody>
              <GraficoCabeca
                titulo="Visitas por profissional"
                apoio="na semana"
              />
              {carga.length === 0 ? (
                <p className="text-tinta-50 text-[12.5px]">
                  Nenhuma visita nesta semana.
                </p>
              ) : (
                <BarrasHorizontais
                  descricao="Visitas de cada enfermeira na semana"
                  dados={carga}
                />
              )}
            </CardBody>
          </Card>
          <Card>
            <CardBody>
              <GraficoCabeca
                titulo="Entrega de ficha no prazo"
                apoio="por profissional"
              />
              <p className="text-tinta-50 text-[12.5px]">
                Este gráfico ainda não está disponível. Ele aparece aqui quando
                o sistema passar a contar as fichas entregues no prazo.
              </p>
            </CardBody>
          </Card>
          <Card>
            <CardBody>
              <GraficoCabeca
                titulo="Conclusão de treinamentos"
                apoio="trilha obrigatória"
              />
              <p className="text-tinta-50 text-[12.5px]">
                Este gráfico ainda não está disponível. Enquanto isso, veja quem
                leu cada manual em Manuais &amp; treinamentos.
              </p>
            </CardBody>
          </Card>
        </div>

        <Nota>
          <b>Vínculo a definir.</b> O vínculo de cada profissional decide se a
          escala é atribuição ou oferta e como o pagamento é calculado. Onde
          está &ldquo;A definir&rdquo;, o sistema não assume nada e espera a
          definição da coordenação.
        </Nota>
      </div>
    </>
  );
}

function GraficoCabeca({ titulo, apoio }: { titulo: string; apoio: string }) {
  return (
    <div className="mb-3 flex items-baseline gap-[9px]">
      <b className="text-[13px] font-semibold">{titulo}</b>
      <span className="text-tinta-50 text-[11px]">{apoio}</span>
    </div>
  );
}

function LinhaProfissional({
  p,
  linha,
  pracas,
}: {
  p: ProfissionalEquipe;
  linha: LinhaEscala | null;
  pracas: string[];
}) {
  const conselho = [
    [p.conselho, p.conselhoUf].filter(Boolean).join("-"),
    p.conselhoNumero,
  ]
    .filter(Boolean)
    .join(" ");
  const dias = linha?.dias ?? [];
  const disponiveis = dias.filter((d) => !d.folga).length;
  const comVisita = dias.filter((d) => d.visitas > 0).length;
  const cargaPct = disponiveis > 0 ? (comVisita / disponiveis) * 100 : 0;
  const sobrecarga = dias.some((d) => d.sobrecarga);
  const nFam = p.familias.length;
  const vencidos = p.documentos.filter((d) => d.situacao === "vencido");
  const vencendo = p.documentos.filter((d) => d.situacao === "vencendo");
  return (
    <tr data-profissional={p.id} className={tabelaMock.tr}>
      <td className={tabelaMock.td}>
        <Link
          href={`/equipe/${p.id}`}
          aria-label={`Abrir o cadastro de ${p.nome}`}
          className="flex items-center gap-2.5 no-underline"
        >
          <Avatar nome={p.nome} />
          <span>
            <span className={cn(tabelaMock.nome, "hover:underline")}>
              {p.nome}
            </span>
            {conselho ? (
              <span className={cn(tabelaMock.sub, "block")}>{conselho}</span>
            ) : null}
          </span>
        </Link>
      </td>
      <td className={tabelaMock.td}>{ROTULO_FUNCAO[p.funcao] ?? p.funcao}</td>
      <td className={tabelaMock.td}>
        {pracas.length > 0 ? pracas.join(" e ") : "Todas"}
      </td>
      <td className={cn(tabelaMock.td, tabelaMock.sub)}>
        {ROTULO_VINCULO[p.vinculo]}
      </td>
      <td className={cn(tabelaMock.td, "min-w-[130px]")}>
        {p.atendeVisitas && p.ativa && linha ? (
          <>
            <Barra
              valor={cargaPct}
              tom={sobrecarga ? "alerta" : "sucesso"}
              rotulo={`Carga da semana de ${p.nome}: ${comVisita} de ${disponiveis} dias com visita`}
              className="mb-[3px]"
            />
            <span className="text-tinta-50 text-[11px]">
              {`${comVisita} de ${disponiveis} dias · ${nFam === 1 ? "1 família" : `${nFam} famílias`}`}
            </span>
          </>
        ) : (
          <span className="text-tinta-50 text-[11px]">Fora da escala</span>
        )}
      </td>
      <td className={tabelaMock.td}>
        {vencidos.length > 0 ? (
          <Selo variante="alerta">
            {vencidos.length === 1
              ? "1 vencido"
              : `${vencidos.length} vencidos`}
          </Selo>
        ) : vencendo.length > 0 ? (
          <Selo variante="aviso">
            {`Vence em ${formatarData(vencendo[0]!.validade ?? "")?.slice(0, 5) ?? "breve"}`}
          </Selo>
        ) : (
          <Selo variante="sucesso">Em dia</Selo>
        )}
      </td>
      <td className={cn(tabelaMock.td, "text-tinta-50 text-[11px]")}>
        Sem dado
      </td>
      <td className={tabelaMock.td}>
        {p.status ? (
          <SeloEstadoProfissional estado={p.status} />
        ) : (
          <Selo variante="neutro">Inativa</Selo>
        )}
      </td>
    </tr>
  );
}
