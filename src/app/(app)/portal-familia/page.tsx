import type { Metadata } from "next";
import Link from "next/link";
import { LockKeyhole } from "lucide-react";
import { Botao } from "@/components/ui/botao";
import { FaixaAlerta } from "@/components/ui/faixa-alerta";
import { exigeMfa } from "@/lib/auth/papeis";
import { exigirSessao } from "@/lib/auth/sessao";
import { ErroRepositorio } from "@/lib/dados/erros";
import { obterRepositorios } from "@/lib/dados/fabrica";
import type {
  AutorizacaoEnfermeiraPortal,
  FamiliaAcessoPortal,
} from "@/lib/dados/tipos-relacao";
import { Card, CardBody, CardHead, Nota } from "@/components/mockup";
import { BlocoFamPortal } from "@/modules/familia/componentes/bloco-fam-portal";
import { CabecalhoGrafico } from "@/modules/relacao/componentes/faixa-resumo";
import { MedidorAdesao } from "@/modules/acesso-familia/componentes/medidor-adesao";
import { AutorizacoesEnfermeiras } from "@/modules/acesso-familia/componentes/autorizacoes";
import { ListaAcessos } from "@/modules/acesso-familia/componentes/lista-acessos";

export const metadata: Metadata = { title: "Portal da família · Kraamzorg OS" };

/**
 * Acesso da família ao portal (P49), do lado da equipe: quem já pode entrar,
 * quem falta liberar, e o que cada enfermeira autorizou a família a ver (nome
 * e foto). Comercial, coordenação e diretoria liberam; a autorização das
 * enfermeiras é da coordenação e da diretoria.
 */
export default async function PaginaAcessoFamilia() {
  const usuario = await exigirSessao("/portal-familia");
  const semMfa = exigeMfa(usuario.papeis) && usuario.aal !== "aal2";
  const gestao = usuario.papeis.some(
    (p) => p === "coordenacao" || p === "diretoria",
  );

  let familias: FamiliaAcessoPortal[] = [];
  let enfermeiras: AutorizacaoEnfermeiraPortal[] = [];
  let falhou = false;
  if (!semMfa) {
    try {
      const { relacao } = await obterRepositorios();
      familias = await relacao.acessoFamilia.listar();
      if (gestao) enfermeiras = await relacao.acessoFamilia.enfermeiras();
    } catch (erro) {
      falhou = !(
        erro instanceof ErroRepositorio && erro.codigo === "sem_permissao"
      );
    }
  }

  const entraram = familias.filter((f) =>
    f.pessoas.some((p) => p.entrou),
  ).length;
  const previa =
    familias
      .filter(
        (f) =>
          f.estadoSensivel !== "bloqueio_total" &&
          f.estadoSensivel !== "encerrado_sensivel",
      )
      .flatMap((f) => f.pessoas)
      .find((p) => p.situacao === "liberado")?.primeiroNome ?? null;

  return (
    <div className="flex flex-col gap-4 pt-2">
      <div className="flex flex-col gap-2">
        <h1 className="font-titulo text-display lg:text-display-lg text-texto font-normal">
          Portal da família
        </h1>
        <p className="text-corpo text-texto-2 max-w-[60ch]">
          Veja quem da família já entra no portal e quem ainda falta liberar.
          Cada pessoa tem o próprio acesso.
        </p>
      </div>

      {semMfa ? (
        <div className="rounded-3 bg-superficie shadow-1 flex max-w-[560px] flex-col gap-3 p-5">
          <p className="text-corpo text-texto flex items-start gap-3">
            <LockKeyhole
              className="text-texto-2 mt-1 size-4 shrink-0"
              aria-hidden="true"
              strokeWidth={1.75}
            />
            Esta tela mostra as famílias com contrato, por isso pede o código do
            aplicativo (MFA) antes de abrir.
          </p>
          <Botao
            asChild
            variante="secundario"
            tamanho="compacto"
            className="self-start"
          >
            <Link
              href={`${usuario.aalPossivel === "aal2" ? "/mfa/desafio" : "/mfa/cadastro"}?proximo=${encodeURIComponent("/portal-familia")}`}
            >
              Confirmar com o código
            </Link>
          </Botao>
        </div>
      ) : falhou ? (
        <FaixaAlerta
          variante="erro"
          titulo="O portal da família não abriu agora"
        >
          Confira a conexão e recarregue a página. Nada foi alterado.
        </FaixaAlerta>
      ) : (
        <>
          <Nota>
            <b>Visão da família.</b> Cada pessoa recebe acesso próprio, com o
            que a Kraamzorg autorizar. O registro assistencial completo não é
            exposto: a família vê o acompanhamento, não o prontuário.
          </Nota>
          <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-[1.15fr_1fr]">
            <div className="flex flex-col gap-4">
              <Card>
                <CardHead
                  titulo="Acessos"
                  direita="liberar, suspender e acompanhar"
                />
                <CardBody>
                  <h2 id="acessos" className="sr-only">
                    Acessos
                  </h2>
                  <ListaAcessos familias={familias} />
                </CardBody>
              </Card>
              {gestao ? (
                <Card>
                  <CardHead
                    titulo={
                      <span id="enfermeiras">Nome e foto das enfermeiras</span>
                    }
                  />
                  <CardBody className="flex flex-col gap-4">
                    <p className="text-corpo text-texto-2 max-w-[64ch]">
                      A família só vê o nome ou a foto da enfermeira que
                      autorizou. Sem autorização, o portal diz que uma
                      enfermeira da equipe vai acompanhar.
                    </p>
                    <AutorizacoesEnfermeiras enfermeiras={enfermeiras} />
                  </CardBody>
                </Card>
              ) : null}
            </div>
            <div className="flex flex-col gap-3.5">
              <Card>
                <CardHead
                  titulo="Minha Kraamzorg"
                  direita={
                    previa ? `como ${previa} enxerga` : "prévia da família"
                  }
                />
                <CardBody>
                  <BlocoFamPortal
                    titulo={previa ? `Olá, ${previa}.` : "Olá."}
                    apoio="O acompanhamento, as datas e as visitas aparecem aqui quando a família entra."
                    progresso={null}
                  />
                  <p className="text-corpo text-texto mt-3 max-w-[60ch]">
                    A família vê os próximos passos e as datas, as visitas em
                    casa, o nome e a foto da enfermeira (só com autorização), o
                    guia de início, a pesquisa de opinião e o contato da equipe.
                    Depois de liberar, a pessoa recebe um convite por e-mail e
                    entra com um link, sem senha. Suspender fecha o acesso na
                    hora.
                  </p>
                </CardBody>
              </Card>
              <Card>
                <CardBody>
                  <CabecalhoGrafico
                    titulo="Adesão ao portal"
                    nota="famílias que acessaram"
                  />
                  {familias.length === 0 ? (
                    <p className="rounded-2 bg-areia-clara text-corpo text-texto-2 px-4 py-6">
                      Quando houver famílias com contrato, a adesão aparece
                      aqui.
                    </p>
                  ) : (
                    <MedidorAdesao
                      valor={(100 * entraram) / familias.length}
                      legenda="das famílias com contrato"
                    />
                  )}
                </CardBody>
              </Card>
              <Card>
                <CardBody>
                  <CabecalhoGrafico titulo="O que a família mais abre" />
                  <p className="rounded-2 bg-areia-clara text-corpo text-texto-2 px-4 py-6">
                    O portal ainda não conta aberturas por assunto. Quando a
                    contagem existir, ela aparece aqui.
                  </p>
                </CardBody>
              </Card>
              <Card>
                <CardHead titulo="O que a família não vê" />
                <CardBody>
                  <ul className="text-[11.5px] leading-[1.8]">
                    {[
                      "Registro assistencial completo",
                      "Anotações internas da equipe",
                      "Ocorrências e tratativas",
                      "Escala e disponibilidade da profissional",
                      "Dados comerciais e de origem do lead",
                    ].map((x, k) => (
                      <li
                        key={x}
                        className={
                          k > 0 ? "border-fio-3 border-t py-[5px]" : "py-[5px]"
                        }
                      >
                        {x}
                      </li>
                    ))}
                  </ul>
                </CardBody>
              </Card>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
