import type { Metadata } from "next";
import Link from "next/link";
import { LockKeyhole } from "lucide-react";
import { BarrasHorizontais, type ItemBarra } from "@/components/graficos";
import { TituloSecao } from "@/components/mockup";
import { Botao } from "@/components/ui/botao";
import { ChaveDeCasa } from "@/components/ilustracoes";
import { CabecalhoTela } from "@/components/shell/cabecalho-tela";
import { EstadoVazio } from "@/components/ui/estado-vazio";
import { FaixaAlerta } from "@/components/ui/faixa-alerta";
import { exigeMfa } from "@/lib/auth/papeis";
import { exigirSessao } from "@/lib/auth/sessao";
import { ErroRepositorio } from "@/lib/dados/erros";
import { obterRepositorios } from "@/lib/dados/fabrica";
import type { EstadoCandidata, ListaTalentos } from "@/lib/dados/tipos-relacao";
import { GradeGraficos, PainelGrafico } from "@/modules/inicio/painel-gestao";
import {
  FaixaResumo,
  type ItemFaixa,
} from "@/modules/relacao/componentes/faixa-resumo";
import { ROTULO_ESTADO_CANDIDATA } from "@/modules/relacao/rotulos";
import { QuadroTalentos } from "@/modules/talentos/componentes/quadro-talentos";
import { FormularioCandidata } from "@/modules/talentos/componentes/form-candidata";

const ORDEM_ETAPAS: EstadoCandidata[] = [
  "nova",
  "em_triagem",
  "entrevista_agendada",
  "entrevistada",
  "aprovada",
  "banco_reserva",
  "nao_seguiu",
  "desistiu",
];

function chegaramEm30Dias(c: { criadoEm: string }[]) {
  const corte = Date.now() - 30 * 86_400_000;
  return c.filter((x) => new Date(x.criadoEm).getTime() >= corte).length;
}

export const metadata: Metadata = { title: "Banco de talentos · Kraamzorg OS" };

/**
 * Banco de talentos (P51 item 3): as candidatas a enfermeira e técnica, a
 * etapa de cada uma e a média dos 10 critérios. A página pública de
 * candidatura existe e nasce desligada; aqui a equipe também cadastra à mão.
 */
export default async function PaginaTalentos() {
  const usuario = await exigirSessao("/talentos");
  const semMfa = exigeMfa(usuario.papeis) && usuario.aal !== "aal2";

  let lista: ListaTalentos | null = null;
  let falhou = false;
  if (!semMfa) {
    try {
      lista = await (await obterRepositorios()).relacao.talentos.listar();
    } catch (erro) {
      falhou = !(
        erro instanceof ErroRepositorio && erro.codigo === "sem_permissao"
      );
    }
  }

  const candidatas = lista?.candidatas ?? [];
  const total = candidatas.length;
  const conta = (...e: EstadoCandidata[]) =>
    candidatas.filter((c) => e.includes(c.estado)).length;
  const novas30 = chegaramEm30Dias(candidatas);
  const notas = candidatas
    .map((c) => c.mediaGeral)
    .filter((m): m is number => m !== null);
  const mediaGeral = notas.length
    ? notas.reduce((a, n) => a + n, 0) / notas.length
    : null;
  const pct = (n: number) => (total ? Math.round((n / total) * 100) : 0);
  const resumo: ItemFaixa[] = [
    {
      rotulo: "Candidatas no banco",
      valor: total,
      contexto: `${novas30} ${novas30 === 1 ? "chegou" : "chegaram"} nos últimos 30 dias`,
      destaque: true,
    },
    {
      rotulo: "Em entrevista",
      valor: conta("entrevista_agendada", "entrevistada"),
      contexto: `${conta("entrevista_agendada")} agendada${conta("entrevista_agendada") === 1 ? "" : "s"}, ${conta("entrevistada")} já entrevistada${conta("entrevistada") === 1 ? "" : "s"}`,
    },
    {
      rotulo: "Aprovadas",
      valor: conta("aprovada"),
      contexto: `${pct(conta("aprovada"))}% das candidatas, mais ${conta("banco_reserva")} no banco de reserva`,
    },
    {
      rotulo: "Média das entrevistas",
      valor:
        mediaGeral === null
          ? "sem nota"
          : mediaGeral.toFixed(1).replace(".", ","),
      contexto: `${notas.length} de ${total} ${total === 1 ? "candidata tem" : "candidatas têm"} nota`,
    },
  ];
  const porEtapa: ItemBarra[] = ORDEM_ETAPAS.map((e) => ({
    rotulo: ROTULO_ESTADO_CANDIDATA[e],
    valor: conta(e),
    tom: e === "aprovada" ? "sucesso" : e === "nova" ? "dourado" : "marinho",
  }));
  const cidades = new Map<string, number>();
  for (const c of candidatas)
    if (c.cidade) cidades.set(c.cidade, (cidades.get(c.cidade) ?? 0) + 1);
  const porCidade: ItemBarra[] = [...cidades.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(([rotulo, valor]) => ({ rotulo, valor, tom: "marinho" as const }));

  return (
    <>
      <CabecalhoTela
        sobretitulo="Relacionamento"
        titulo="Banco de talentos"
        subtitulo="As candidatas em seleção, a etapa de cada uma e a nota da entrevista."
      />
      <div className="flex flex-col gap-3.5 pt-3.5">
        {semMfa ? (
          <div className="rounded-3 bg-superficie shadow-1 flex max-w-[560px] flex-col gap-3 p-5">
            <p className="text-corpo text-texto flex items-start gap-3">
              <LockKeyhole
                className="text-texto-2 mt-1 size-4 shrink-0"
                aria-hidden="true"
                strokeWidth={1.75}
              />
              Esta tela guarda dados de candidatas, por isso pede o código do
              aplicativo de verificação antes de abrir.
            </p>
            <Botao
              asChild
              variante="secundario"
              tamanho="compacto"
              className="self-start"
            >
              <Link
                href={`${usuario.aalPossivel === "aal2" ? "/mfa/desafio" : "/mfa/cadastro"}?proximo=${encodeURIComponent("/talentos")}`}
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
                ? "O banco de talentos não abriu agora"
                : "O banco de talentos é da coordenação e da diretoria"
            }
          >
            {falhou
              ? "Confira a conexão e recarregue a página. Nada foi alterado."
              : "Peça o acesso à coordenação."}
          </FaixaAlerta>
        ) : (
          <>
            <FaixaAlerta
              variante="info"
              titulo={
                lista.paginaPublicaAtiva
                  ? "Página de candidatura aberta"
                  : "Página de candidatura desligada"
              }
            >
              {lista.paginaPublicaAtiva
                ? "Quem se candidatar pelo site entra aqui como Nova."
                : "Por enquanto ninguém se candidata pelo site. Para abrir, a diretoria liga a página de candidatura em Configurações."}
            </FaixaAlerta>
            {lista.candidatas.length === 0 ? (
              <EstadoVazio
                nivelTitulo="h2"
                ilustracao={<ChaveDeCasa tamanho={104} />}
                titulo="Nenhuma candidata ainda"
                texto="Cadastre a primeira no formulário abaixo. A entrevista pelo roteiro e as notas ficam na ficha de cada uma, e o funil por etapa aparece aqui."
              />
            ) : (
              <>
                <FaixaResumo rotulo="Resumo das candidatas" itens={resumo} />
                <GradeGraficos colunas={2}>
                  <PainelGrafico
                    titulo="Candidatas por etapa"
                    nota={`${total} no banco`}
                    leitura="Cada barra é uma etapa do processo de seleção."
                  >
                    <BarrasHorizontais
                      rotulo="Candidatas por etapa"
                      larguraRotulo="9rem"
                      itens={porEtapa}
                    />
                  </PainelGrafico>
                  <PainelGrafico
                    titulo="Candidatas por cidade"
                    nota="As cidades com mais candidatas"
                    vazio={
                      porCidade.length === 0
                        ? "Ainda não há cidade informada. Preencha na ficha de cada candidata."
                        : undefined
                    }
                  >
                    <BarrasHorizontais
                      rotulo="Candidatas por cidade"
                      larguraRotulo="9rem"
                      itens={porCidade}
                    />
                  </PainelGrafico>
                </GradeGraficos>
                <section
                  aria-labelledby="t-funil"
                  className="flex flex-col gap-3"
                >
                  <TituloSecao id="t-funil" className="mt-[11px] mb-0">
                    Funil de seleção
                  </TituloSecao>
                  <QuadroTalentos candidatas={lista.candidatas} />
                </section>
              </>
            )}
            <div className="max-w-[640px]">
              <FormularioCandidata />
            </div>
          </>
        )}
      </div>
    </>
  );
}
