import type { Metadata } from "next";
import { z } from "zod";
import Link from "next/link";
import { ArrowLeft, ChevronLeft, ChevronRight } from "lucide-react";
import { CabecalhoTela } from "@/components/shell/cabecalho-tela";
import { ChaveDeCasa } from "@/components/ilustracoes";
import {
  Card,
  CardBody,
  CardHead,
  Kpi,
  Nota,
  classesChip,
} from "@/components/mockup";
import { BarrasHorizontais } from "@/components/graficos/barras-horizontais";
import { cn } from "@/lib/utils";
import { EstadoVazio } from "@/components/ui/estado-vazio";
import { FaixaAlerta } from "@/components/ui/faixa-alerta";
import {
  eDataValida,
  hojeEmBrasilia,
  inicioDaSemana,
  somarDias,
} from "@/lib/agenda/datas";
import { exigirSessao } from "@/lib/auth/sessao";
import { obterRepositorios } from "@/lib/dados/fabrica";
import type { OcupacaoSemana } from "@/lib/dados/tipos-operacao";
import {
  GradeEscala,
  LegendaGrade,
  MapaOcupacao,
} from "@/modules/operacao/equipe/componentes/grade-escala";
import { rotuloSemana } from "@/modules/operacao/equipe/componentes/semana-equipe";
import {
  carregarEscala,
  type EscalaTela,
} from "@/modules/operacao/equipe/dados";

export const metadata: Metadata = { title: "Escala da semana · Kraamzorg OS" };

type Pesquisa = Record<string, string | string[] | undefined>;
const um = (v: string | string[] | undefined) =>
  (Array.isArray(v) ? v[0] : v) ?? null;

/**
 * Escala semanal (P37 item 5): sete dias por dois turnos para cada
 * enfermeira, com visita, folga, reservada, backup e oferta, e o conflito
 * ou a sobrecarga marcados. Calculada das visitas, das designações e dos
 * bloqueios; nada é digitado.
 */
export default async function PaginaEscala({
  searchParams,
}: {
  searchParams: Promise<Pesquisa>;
}) {
  await exigirSessao("/equipe");
  const pesquisa = await searchParams;
  const hoje = hojeEmBrasilia();
  const pedida = um(pesquisa.semana);
  const semana = inicioDaSemana(pedida && eDataValida(pedida) ? pedida : hoje);
  const pracaPedida = um(pesquisa.praca);
  const regiaoId =
    pracaPedida && z.uuid().safeParse(pracaPedida).success ? pracaPedida : null;

  let tela: EscalaTela | null = null;
  try {
    tela = await carregarEscala({ semana, regiaoId });
  } catch (erro) {
    console.error(
      "[tela-erro] /equipe/escala",
      erro instanceof Error ? erro.message : erro,
    );
    tela = null;
  }

  let ocupacao: OcupacaoSemana[] = [];
  try {
    const { operacao } = await obterRepositorios();
    ocupacao = (await operacao.radar(null)).ocupacao;
  } catch (erro) {
    console.error(
      "[tela-erro] /equipe/escala ocupação",
      erro instanceof Error ? erro.message : erro,
    );
  }

  const anterior = somarDias(semana, -7);
  const proxima = somarDias(semana, 7);
  const fim = somarDias(semana, 6);
  const sufixo = regiaoId ? `&praca=${encodeURIComponent(regiaoId)}` : "";

  const linhas = tela?.escala.profissionais ?? [];
  const todosOsDias = linhas.flatMap((l) => l.dias);
  const diasProfissional = todosOsDias.filter((d) => !d.folga).length;
  const comVisita = todosOsDias.filter((d) => d.visitas > 0).length;
  const diasBackup = todosOsDias.filter(
    (d) => d.manha.estado === "backup" || d.tarde.estado === "backup",
  ).length;
  const folgas = todosOsDias.filter((d) => d.folga).length;
  const comFolga = linhas.filter((l) => l.dias.some((d) => d.folga)).length;
  const conflitos = todosOsDias.filter(
    (d) => d.manha.conflito || d.tarde.conflito,
  ).length;
  const sobrecargas = todosOsDias.filter((d) => d.sobrecarga).length;
  const carga = linhas
    .map((l) => ({
      id: l.profissionalId,
      rotulo: l.nome,
      valor: l.dias.reduce((t, d) => t + d.visitas, 0),
    }))
    .sort((a, b) => b.valor - a.valor)
    .map((c) => ({
      ...c,
      valorTexto: c.valor === 1 ? "1 visita" : `${c.valor} visitas`,
    }));

  const chip = cn(
    classesChip(),
    "min-h-toque justify-center no-underline lg:min-h-8",
  );

  return (
    <>
      <CabecalhoTela
        titulo="Escala da semana"
        subtitulo={`De ${rotuloSemana(semana, fim)}. Calculada das visitas, das ofertas aceitas e das folgas; nada é digitado.`}
      />
      <div className="flex flex-col gap-3.5 pt-4">
        <div className="flex flex-wrap items-center gap-[9px]">
          <Link
            href="/equipe"
            className="text-tinta-70 hover:text-texto min-h-toque mr-auto -ml-1 inline-flex items-center gap-1.5 text-[12.5px] font-medium no-underline"
          >
            <ArrowLeft
              aria-hidden="true"
              className="size-4"
              strokeWidth={1.75}
            />
            Voltar para a equipe
          </Link>
          <Link
            href={`/equipe/escala?semana=${anterior}${sufixo}`}
            aria-label="Semana anterior"
            className={chip}
          >
            <ChevronLeft aria-hidden="true" className="size-4" />
          </Link>
          <span className={chip}>{rotuloSemana(semana, fim)}</span>
          <Link
            href={`/equipe/escala?semana=${proxima}${sufixo}`}
            aria-label="Próxima semana"
            className={chip}
          >
            <ChevronRight aria-hidden="true" className="size-4" />
          </Link>
          {semana !== inicioDaSemana(hoje) ? (
            <Link
              href={`/equipe/escala${regiaoId ? `?praca=${regiaoId}` : ""}`}
              className={chip}
            >
              Esta semana
            </Link>
          ) : null}
        </div>

        {!tela ? (
          <FaixaAlerta variante="erro" titulo="A escala não abriu agora">
            Nada foi alterado. Recarregue a página; se continuar, avise a equipe
            técnica.
          </FaixaAlerta>
        ) : (
          <>
            <Nota>
              <b>Escala é oferta ou atribuição?</b> Depende do vínculo de cada
              profissional, que fica no cadastro dela. Quem é atribuída pela
              coordenação entra na escala direto; quem recebe oferta entra
              depois de aceitar. Nenhum dia é marcado à mão nesta tela.
            </Nota>

            <div className="grid grid-cols-2 gap-3.5 lg:grid-cols-4">
              <Kpi
                rotulo="Dias de profissional na semana"
                valor={diasProfissional}
                delta={`${comVisita} com visita`}
              />
              <Kpi
                rotulo="Dias de backup"
                valor={diasBackup}
                delta={
                  diasBackup === 0
                    ? "nenhum dia coberto por backup"
                    : "dias com cobertura de backup"
                }
              />
              <Kpi
                rotulo="Ausências previstas"
                valor={folgas}
                delta={
                  comFolga === 1
                    ? "de 1 profissional"
                    : `de ${comFolga} profissionais`
                }
              />
              <Kpi
                rotulo="Conflitos abertos"
                valor={conflitos}
                tomDelta={conflitos + sobrecargas > 0 ? "alerta" : "neutro"}
                delta={
                  sobrecargas === 0
                    ? "nenhum dia acima do limite"
                    : sobrecargas === 1
                      ? "1 dia acima do limite de visitas"
                      : `${sobrecargas} dias acima do limite de visitas`
                }
              />
            </div>

            <Card>
              <CardHead
                titulo="Escala da semana"
                direita={rotuloSemana(semana, fim)}
              />
              <CardBody>
                {linhas.length === 0 ? (
                  <EstadoVazio
                    nivelTitulo="h2"
                    ilustracao={<ChaveDeCasa tamanho={112} />}
                    titulo="Nenhuma enfermeira na escala"
                    texto="Quando houver enfermeiras ativas, cada uma aparece aqui com a semana dela."
                  />
                ) : (
                  <>
                    <GradeEscala linhas={linhas} hoje={hoje} />
                    <LegendaGrade />
                    {sobrecargas > 0 ? (
                      <Nota tom="alerta" className="mt-3.5 text-[11.5px]">
                        {`Há ${sobrecargas === 1 ? "1 dia" : `${sobrecargas} dias`} com mais de ${tela.escala.limiteVisitasDia} visitas para a mesma enfermeira. Abra a agenda para reagendar.`}
                      </Nota>
                    ) : null}
                  </>
                )}
              </CardBody>
            </Card>

            <div className="grid grid-cols-1 gap-3.5 lg:grid-cols-2">
              <Card>
                <CardBody>
                  <div className="mb-3 flex items-baseline gap-[9px]">
                    <b className="text-[13px] font-semibold">
                      Carga por profissional
                    </b>
                    <span className="text-tinta-50 text-[11px]">
                      visitas na semana
                    </span>
                  </div>
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
                  <div className="mb-3 flex items-baseline gap-[9px]">
                    <b className="text-[13px] font-semibold">
                      Ocupação por praça e semana
                    </b>
                    <span className="text-tinta-50 text-[11px]">
                      projeção das próximas semanas
                    </span>
                  </div>
                  <MapaOcupacao ocupacao={ocupacao} />
                  <p className="text-tinta-50 mt-2.5 text-[11.5px]">
                    Âmbar acima do limite de alerta da praça, vermelho em 100%
                    ou mais.
                  </p>
                </CardBody>
              </Card>
            </div>
          </>
        )}
      </div>
    </>
  );
}
