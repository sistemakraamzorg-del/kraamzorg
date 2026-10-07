import type { Metadata } from "next";
import Link from "next/link";
import { LockKeyhole } from "lucide-react";
import { CabecalhoTela } from "@/components/shell/cabecalho-tela";
import { Barra, Card, CardBody, CardHead, Nota } from "@/components/mockup";
import { Botao } from "@/components/ui/botao";
import { FaixaAlerta } from "@/components/ui/faixa-alerta";
import { descreverPapeis, exigeMfa } from "@/lib/auth/papeis";
import { exigirSessao } from "@/lib/auth/sessao";
import { ErroRepositorio } from "@/lib/dados/erros";
import { obterRepositorios } from "@/lib/dados/fabrica";
import type {
  ConfigCopiloto,
  PerguntaCopiloto,
} from "@/lib/dados/tipos-relacao";
import { formatarDataHora, formatarMoeda } from "@/lib/formatacao";
import { PainelCopiloto } from "@/modules/copiloto/componentes/painel-copiloto";

export const metadata: Metadata = { title: "Copiloto · Kraamzorg OS" };

const EXEMPLOS = [
  "Quantas oportunidades há em cada estágio do pipeline 1?",
  "Qual foi a taxa de conversão de leads neste mês?",
  "Quantos leads vieram de cada origem no mês passado?",
  "Qual a receita paga em setembro?",
  "Quais praças estão perto do limite de ocupação?",
];

/**
 * Copiloto interno (P48): pergunta em linguagem natural sobre pipeline,
 * conversão, receita, ocupação e origem dos leads, para a diretoria e o
 * comercial. O modelo escolhe entre cinco funções de leitura, sempre com as
 * permissões de quem pergunta, e nunca vê dado assistencial. As perguntas
 * ficam no histórico e o custo do mês está aqui, à vista.
 */
export default async function PaginaCopiloto() {
  const usuario = await exigirSessao("/copiloto");
  const semMfa = exigeMfa(usuario.papeis) && usuario.aal !== "aal2";

  let config: ConfigCopiloto | null = null;
  let historico: PerguntaCopiloto[] = [];
  let falhou = false;
  if (!semMfa) {
    try {
      const { relacao } = await obterRepositorios();
      [config, historico] = await Promise.all([
        relacao.copiloto.config(),
        relacao.copiloto.historico(8),
      ]);
    } catch (erro) {
      if (!(
        erro instanceof ErroRepositorio && erro.codigo === "sem_permissao"
      )) {
        falhou = true;
      }
    }
  }

  return (
    <>
      <CabecalhoTela
        titulo="Copiloto"
        subtitulo="Pergunte em uma frase e veja os números com a conta que os sustenta."
      />
      <div className="flex flex-col gap-3.5 pt-5">
        {semMfa ? (
          <div className="rounded-3 bg-superficie shadow-1 border-linha flex max-w-[560px] flex-col gap-3 border p-5">
            <p className="text-corpo text-texto flex items-start gap-3">
              <LockKeyhole
                className="text-texto-2 mt-1 size-4 shrink-0"
                aria-hidden="true"
                strokeWidth={1.75}
              />
              O copiloto consulta números do negócio, por isso pede o código do
              aplicativo de verificação antes de abrir.
            </p>
            <Botao
              asChild
              variante="secundario"
              tamanho="compacto"
              className="self-start"
            >
              <Link
                href={`${usuario.aalPossivel === "aal2" ? "/mfa/desafio" : "/mfa/cadastro"}?proximo=${encodeURIComponent("/copiloto")}`}
              >
                Confirmar com o código
              </Link>
            </Botao>
          </div>
        ) : falhou || !config ? (
          <FaixaAlerta
            variante={falhou ? "erro" : "info"}
            titulo={
              falhou
                ? "O copiloto não abriu agora"
                : "O copiloto não faz parte da sua função"
            }
          >
            {falhou
              ? "Confira a conexão e recarregue a página. Nada foi alterado."
              : "O copiloto é da diretoria e do comercial."}
          </FaixaAlerta>
        ) : (
          <>
            {!config.ativo ? (
              <FaixaAlerta variante="info" titulo="O copiloto está desligado">
                A diretoria desligou o copiloto em Configurações. As perguntas
                ficam registradas, mas nenhuma vai a serviço de IA.
              </FaixaAlerta>
            ) : null}

            <PainelCopiloto
              limite={config.perguntaMaxCaracteres}
              exemplos={EXEMPLOS}
              sessao={`Sessão de ${usuario.nome} · ${descreverPapeis(usuario.papeis)}`}
              lateral={
                <>
                  <Card>
                    <CardHead titulo="Limite de acesso" />
                    <CardBody>
                      <p className="text-tinta-50 text-[11.5px] leading-[1.7]">
                        O copiloto responde só o que a sua função permite ver.
                        Sobre a saúde das famílias ele não responde: a pergunta
                        recebe um não claro, sem resumo.
                      </p>
                      <Nota tom="sensivel" className="mt-3 text-[11.5px]">
                        Essa trava está no próprio sistema, não num pedido ao
                        copiloto. Por isso nenhuma pergunta consegue contornar.
                      </Nota>
                    </CardBody>
                  </Card>

                  <Card>
                    <CardHead titulo="Custo do mês" />
                    <CardBody className="flex flex-col gap-3">
                      <p
                        className="text-tinta-70 text-[12.5px] leading-[1.6]"
                        data-teste="custo-mes"
                      >
                        {config.perguntasMes === 0
                          ? "Nenhuma pergunta neste mês ainda."
                          : `${config.perguntasMes} ${config.perguntasMes === 1 ? "pergunta" : "perguntas"} neste mês, com custo de ${formatarMoeda(config.custoMesCentavos)}${config.orcamentoMensalCentavos !== null ? `, de um limite de ${formatarMoeda(config.orcamentoMensalCentavos)}` : ""}.`}
                        {config.perguntasMes === 0 &&
                        config.orcamentoMensalCentavos !== null
                          ? ` O limite do mês é de ${formatarMoeda(config.orcamentoMensalCentavos)}.`
                          : ""}
                      </p>
                      {config.orcamentoMensalCentavos ? (
                        <>
                          <Barra
                            valor={
                              (config.custoMesCentavos /
                                config.orcamentoMensalCentavos) *
                              100
                            }
                            tom={
                              config.custoMesCentavos >=
                              config.orcamentoMensalCentavos
                                ? "alerta"
                                : "dourado"
                            }
                            rotulo="Parte do limite do mês usada"
                          />
                          <p className="text-tinta-50 text-[11.5px]">
                            {config.custoMesCentavos >=
                            config.orcamentoMensalCentavos
                              ? "O limite do mês foi todo usado"
                              : `${Math.min(100, Math.round((config.custoMesCentavos / config.orcamentoMensalCentavos) * 100))}% do limite do mês usado`}
                          </p>
                        </>
                      ) : null}
                    </CardBody>
                  </Card>

                  {historico.length > 0 ? (
                    <Card>
                      <CardHead titulo="Últimas perguntas" />
                      <ul className="px-4 py-2.5 text-[11.5px]">
                        {historico.map((p) => (
                          <li
                            key={p.id}
                            className="border-fio-3 flex flex-col gap-0.5 border-b py-2 last:border-b-0"
                          >
                            <span className="text-texto text-[12.5px]">
                              {p.pergunta}
                            </span>
                            <span className="text-tinta-50">
                              {formatarDataHora(p.em)}
                              {p.quem ? `, ${p.quem}` : ""}
                              {p.situacao === "respondida"
                                ? ", respondida"
                                : p.situacao === "recusada"
                                  ? ", recusada"
                                  : p.situacao === "desligado"
                                    ? ", copiloto desligado"
                                    : p.situacao === "orcamento"
                                      ? ", sem orçamento"
                                      : ", com erro"}
                            </span>
                          </li>
                        ))}
                      </ul>
                    </Card>
                  ) : null}
                </>
              }
            />
          </>
        )}
      </div>
    </>
  );
}
