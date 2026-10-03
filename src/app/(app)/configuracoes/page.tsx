import type { Metadata } from "next";
import Link from "next/link";
import { Card, CardBody, Eyebrow, Nota } from "@/components/mockup";
import { CabecalhoTela } from "@/components/shell/cabecalho-tela";
import { ChaveDeCasa } from "@/components/ilustracoes";
import { EstadoVazio } from "@/components/ui/estado-vazio";
import { exigirSessao } from "@/lib/auth/sessao";
import {
  AbasConfiguracoes,
  type AbaConfiguracoes,
} from "@/modules/configuracoes/componentes/abas";
import { SecaoCondicoes } from "@/modules/configuracoes/componentes/secao-condicoes";
import { SecaoMensagens } from "@/modules/configuracoes/componentes/secao-mensagens";
import { SecaoPacotes } from "@/modules/configuracoes/componentes/secao-pacotes";
import { SecaoRegioes } from "@/modules/configuracoes/componentes/secao-regioes";
import { SecaoRegua } from "@/modules/configuracoes/componentes/secao-regua";
import { SecaoTermosAlerta } from "@/modules/configuracoes/componentes/secao-termos-alerta";
import { podeVerTudo } from "@/modules/configuracoes/dados/tipos";

export const metadata: Metadata = { title: "Configurações · Kraamzorg OS" };

const ABAS_DIRETORIA: AbaConfiguracoes[] = [
  { chave: "pacotes", rotulo: "Pacotes e preços" },
  { chave: "regioes", rotulo: "Regiões e localidades" },
  { chave: "condicoes", rotulo: "Condições comerciais" },
  { chave: "mensagens", rotulo: "Mensagens" },
  { chave: "termos-alerta", rotulo: "Termos de alerta" },
  { chave: "regua", rotulo: "Régua" },
];

const ABAS_COORDENACAO: AbaConfiguracoes[] = [
  { chave: "termos-alerta", rotulo: "Termos de alerta" },
];

/** Os três blocos de atalho do mockup, apontando para as abas que já existem. */
const ATALHOS: { titulo: string; texto: string; abas: string[] }[] = [
  {
    titulo: "Catálogo",
    texto: "Pacotes e versões de preço, condições de pagamento.",
    abas: ["pacotes", "condicoes"],
  },
  {
    titulo: "Operação",
    texto: "Cidades e regiões atendidas e a régua de contato.",
    abas: ["regioes", "regua"],
  },
  {
    titulo: "Agente e segurança",
    texto: "Mensagens da família e termos que disparam alerta.",
    abas: ["mensagens", "termos-alerta"],
  },
];

const BLOCO_TABELA =
  "min-[720px]:rounded-3 min-[720px]:bg-superficie min-[720px]:shadow-1 min-[720px]:p-4 lg:p-5";

/**
 * Configurações (P13): parâmetros com validação por tipo e histórico,
 * pacotes e versões com vigência, regiões e localidades, condições
 * comerciais, mensagens com prévia e fluxo de rascunho para aprovado,
 * termos de alerta para a coordenação e faixas da régua.
 *
 * Diretoria vê tudo; coordenação vê só termos de alerta (PRD 13, "Parâmetros
 * e configurações"). O proxy e `exigirSessao` já garantem que só esses dois
 * papéis chegam nesta rota (`src/lib/navegacao/index.ts`); aqui a tela
 * ainda decide o que cada um vê dentro dela, porque a matriz do PRD 13 é
 * mais estreita que "ter acesso à rota".
 */
export default async function PaginaConfiguracoes({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sessao = await exigirSessao("/configuracoes");
  const vePreco = podeVerTudo(sessao.papeis);
  const abas = vePreco ? ABAS_DIRETORIA : ABAS_COORDENACAO;

  const pedida = (await searchParams).aba;
  const abaPedida = Array.isArray(pedida) ? pedida[0] : pedida;
  const aba = abas.some((a) => a.chave === abaPedida)
    ? abaPedida!
    : abas[0]!.chave;

  return (
    <>
      <CabecalhoTela
        titulo="Configurações"
        subtitulo={
          vePreco
            ? "Preços, regiões, condições comerciais, mensagens, termos de alerta e a régua de contato."
            : "Os termos que disparam alerta ou bloqueio para a equipe de saúde."
        }
      />
      <Nota className="mt-3.5">
        <b>Regra de negócio não mora no código.</b> Tudo nesta tela é editável
        pela Kraamzorg sem precisar de deploy.
      </Nota>
      <div className="mt-3.5">
        <AbasConfiguracoes abas={abas} ativa={aba} />
      </div>
      {/* Tela densa (DESIGN.md, 2: Restrained): as tabelas moram num bloco
          branco no computador; no celular cada linha já vira um cartão. */}
      <div className="pt-3.5">
        {aba === "pacotes" && vePreco ? (
          <SecaoPacotes />
        ) : aba === "regioes" && vePreco ? (
          <SecaoRegioes />
        ) : aba === "condicoes" && vePreco ? (
          <div className={BLOCO_TABELA}>
            <SecaoCondicoes />
          </div>
        ) : aba === "mensagens" && vePreco ? (
          <SecaoMensagens />
        ) : aba === "termos-alerta" ? (
          <div className={BLOCO_TABELA}>
            <SecaoTermosAlerta />
          </div>
        ) : aba === "regua" && vePreco ? (
          <SecaoRegua />
        ) : (
          <EstadoVazio
            ilustracao={<ChaveDeCasa tamanho={104} />}
            titulo="Esta seção não está disponível para o seu papel"
            texto="Volte para os termos de alerta ou fale com a diretoria se precisar de mais acesso."
          />
        )}
      </div>
      {vePreco ? (
        <div className="mt-3.5 grid grid-cols-1 gap-3.5 lg:grid-cols-3">
          {ATALHOS.map((a) => (
            <Card key={a.titulo}>
              <CardBody>
                <Eyebrow>{a.titulo}</Eyebrow>
                <p className="mt-[7px] text-[11.5px] leading-[1.7]">
                  {a.texto}
                </p>
                <div className="mt-2 flex flex-wrap gap-x-3">
                  {a.abas.map((chave) => (
                    <Link
                      key={chave}
                      href={`/configuracoes?aba=${chave}`}
                      className="text-dourado-texto inline-flex min-h-11 items-center text-[12.5px] font-medium underline underline-offset-2 lg:min-h-8"
                    >
                      {ABAS_DIRETORIA.find((x) => x.chave === chave)?.rotulo}
                    </Link>
                  ))}
                </div>
              </CardBody>
            </Card>
          ))}
        </div>
      ) : null}
    </>
  );
}
