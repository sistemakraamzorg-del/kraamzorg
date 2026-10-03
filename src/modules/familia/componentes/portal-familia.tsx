import Image from "next/image";
import type { ReactNode } from "react";
import {
  Check,
  CircleDot,
  ClipboardList,
  House,
  Phone,
  UserRound,
} from "lucide-react";
import { Eyebrow, Nota, classesChip } from "@/components/mockup";
import { Selo } from "@/components/ui/selo";
import type {
  ContatoEquipePortal,
  PortalFamilia,
  PortalFamiliaCompleto,
} from "@/lib/dados/tipos-relacao";
import {
  formatarData,
  formatarDataHora,
  formatarTelefone,
} from "@/lib/formatacao";
import { cn } from "@/lib/utils";
import { Avatar } from "@/modules/relacao/componentes/faixa-resumo";
import { BlocoFamPortal } from "./bloco-fam-portal";
import { montarPassos, type Passo } from "../passos";
import { BotaoSair } from "./botao-sair";

/**
 * O portal da família (P49), no desenho do `.fam-portal` do mockup da
 * cliente: cartão creme com o cumprimento pelo nome e a barra de progresso,
 * a próxima visita e a equipe lado a lado, e cada assunto numa caixa de
 * linhas com selo. Datas de fato e estimativa nunca se misturam.
 * Frases que falam com a família vêm de mensagem_modelo (textos do portal);
 * aqui ficam só os rótulos curtos da tela. Família em pausa (freio, perda)
 * vê só o contato, sem tom de apoio.
 */

const ROTULO_ESTADO: Record<Passo["estado"], string> = {
  feito: "Feito",
  agora: "Agora",
  depois: "Em seguida",
};

const DESCRICAO: Record<string, string> = {
  passos: "O caminho até as visitas, na ordem em que acontece.",
  datas: "Cada data diz se é uma estimativa ou um fato já confirmado.",
  enfermeira: "Quem vai cuidar de vocês em casa.",
  visitas: "Os dias em que a enfermeira vai até vocês.",
  guia: "O que ter em mente para começar bem.",
  evolucoes: "Os registros que a equipe compartilhou com vocês.",
  pesquisa: "Contar como foi ajuda a cuidar melhor das próximas famílias.",
};

function ContatoDaEquipe({
  contato,
  forte,
}: {
  contato: ContatoEquipePortal;
  /** Dentro do bloco marinho: texto creme. */
  forte: boolean;
}) {
  return (
    <div className="flex flex-col gap-1">
      {contato.nome ? (
        <p
          className={cn(
            "font-titulo text-2 font-medium",
            forte ? "text-texto-inverso" : "text-texto",
          )}
        >
          {contato.nome}
        </p>
      ) : null}
      {contato.funcao ? (
        <p
          className={cn(
            "text-corpo",
            forte ? "text-texto-inverso-2" : "text-texto-2",
          )}
        >
          {contato.funcao}
        </p>
      ) : null}
      {contato.telefoneE164 ? (
        <p className="pt-2">
          <a
            className={cn(
              "rounded-pilula text-corpo min-h-toque inline-flex items-center gap-2 px-5 font-semibold no-underline",
              forte
                ? "bg-creme text-marinho"
                : "border-borda-campo bg-superficie text-texto border-[1.5px]",
            )}
            href={`tel:${contato.telefoneE164}`}
          >
            <Phone className="size-5" aria-hidden="true" strokeWidth={1.75} />
            <span className="font-mono">
              {formatarTelefone(contato.telefoneE164) ?? contato.telefoneE164}
            </span>
          </a>
        </p>
      ) : null}
      {contato.horario ? (
        <p
          className={cn(
            "text-corpo pt-1",
            forte ? "text-texto-inverso-2" : "text-texto-2",
          )}
        >
          {contato.horario}
        </p>
      ) : null}
    </div>
  );
}

const SELO_PASSO: Record<Passo["estado"], "sucesso" | "aviso" | "neutro"> = {
  feito: "sucesso",
  agora: "aviso",
  depois: "neutro",
};

/** Linha de lista do mockup (`.doc`): bloco de ícone, título, apoio e selo. */
function Linha({
  icone,
  titulo,
  apoio,
  selo,
  className,
  ...props
}: {
  icone?: ReactNode;
  titulo: ReactNode;
  apoio?: ReactNode;
  selo?: ReactNode;
  className?: string;
} & React.LiHTMLAttributes<HTMLLIElement>) {
  return (
    <li
      className={cn(
        "border-fio-3 flex items-center gap-[11px] border-b px-4 py-[11px] last:border-b-0",
        className,
      )}
      {...props}
    >
      {icone ? (
        <span
          aria-hidden="true"
          className="bg-creme-2 border-fio-2 text-marinho flex h-9 w-[30px] flex-none items-center justify-center rounded-[4px] border [&>svg]:size-4"
        >
          {icone}
        </span>
      ) : null}
      <div className="min-w-0 flex-1">
        <b className="text-[12.5px]">{titulo}</b>
        {apoio ? (
          <div className="text-tinta-50 text-[11.5px]">{apoio}</div>
        ) : null}
      </div>
      {selo}
    </li>
  );
}

function ItemPasso({ passo }: { passo: Passo }) {
  const Icone =
    passo.estado === "feito"
      ? Check
      : passo.estado === "agora"
        ? CircleDot
        : ClipboardList;
  // Com a data da próxima visita já marcada, a frase de espera ("as visitas
  // aparecem aqui quando a coordenação confirmar") contradiz a data e sai.
  const apoio =
    passo.chave === "visitas" && passo.dataMarcada ? null : passo.apoio;
  const data = passo.data
    ? `${passo.dataMarcada ? "Marcada para " : ""}${
        passo.chave === "prenatal" && passo.dataMarcada
          ? formatarDataHora(passo.data)
          : formatarData(passo.data)
      }`
    : null;
  return (
    <Linha
      data-passo={passo.chave}
      data-estado={passo.estado}
      aria-current={passo.estado === "agora" ? "step" : undefined}
      className={passo.estado === "agora" ? "bg-dourado-lavado" : undefined}
      icone={<Icone />}
      titulo={passo.titulo}
      apoio={
        data || apoio ? (
          <>
            {data ? <span className="font-mono">{data}</span> : null}
            {data && apoio ? " · " : null}
            {apoio}
          </>
        ) : null
      }
      selo={
        <Selo variante={SELO_PASSO[passo.estado]}>
          {ROTULO_ESTADO[passo.estado]}
        </Selo>
      }
    />
  );
}

/** Título de bloco do portal (`.eyebrow`) com a frase do que ele mostra. */
function Secao({
  id,
  titulo,
  descricao,
  children,
}: {
  id: string;
  titulo: string;
  /** Uma frase de rótulo de interface: o que este bloco mostra. */
  descricao?: string;
  children: ReactNode;
}) {
  return (
    <section id={`secao-${id}`} aria-labelledby={id} className="scroll-mt-4">
      <h2 id={id} className="mb-1">
        <Eyebrow>{titulo}</Eyebrow>
      </h2>
      {descricao ? (
        <p className="text-tinta-50 mb-2 text-[11.5px]">{descricao}</p>
      ) : (
        <div className="mb-2" />
      )}
      {children}
    </section>
  );
}

const CAIXA = "border-linha bg-superficie rounded-[9px] border";

function Completo({
  portal,
  hoje,
}: {
  portal: PortalFamiliaCompleto;
  hoje: string;
}) {
  const t = portal.textos;
  const passos = montarPassos(portal, hoje);
  const feitos = passos.filter((p) => p.estado === "feito").length;
  const proxima = portal.visitas.find((v) => !v.feita);
  const proximaVisita = proxima?.dia;
  const feitas = portal.visitas.filter((v) => v.feita).length;
  const ac = portal.acompanhamento;
  const curta = (iso: string) => (formatarData(iso) ?? "").slice(0, 5);
  const d = portal.datas;
  const datas: {
    chave: string;
    rotulo: string;
    valor: string;
    marca: "estimativa" | "fato";
  }[] = [];
  if (d.dpp)
    datas.push({
      chave: "dpp",
      rotulo: "Data provável do parto",
      valor: d.dpp,
      marca: "estimativa",
    });
  if (d.dataNascimento)
    datas.push({
      chave: "nascimento",
      rotulo: "Nascimento",
      valor: d.dataNascimento,
      marca: "fato",
    });
  if (d.dataAlta)
    datas.push({
      chave: "alta",
      rotulo: "Alta da maternidade",
      valor: d.dataAlta,
      marca: "fato",
    });
  if (d.dataInicioEfetivo)
    datas.push({
      chave: "inicio",
      rotulo: "Início das visitas",
      valor: d.dataInicioEfetivo,
      marca: "fato",
    });

  return (
    <>
      <BlocoFamPortal
        titulo={t.titulo}
        apoio={t.boas_vindas}
        progresso={{
          valor: feitos,
          maximo: passos.length,
          rotulo: "Passos concluídos",
        }}
        extremos={
          ac?.inicioEfetivo && ac.encerramento
            ? [
                `Início ${curta(ac.inicioEfetivo)}`,
                `Encerra ${curta(ac.encerramento)}`,
              ]
            : [`${feitos} de ${passos.length} passos concluídos`, ""]
        }
      >
        <nav aria-label="Ir para" className="flex flex-wrap gap-2 pt-3">
          {[
            ["#secao-passos", "Passos"],
            ["#secao-visitas", "Visitas"],
            ["#secao-enfermeira", "Equipe"],
            ["#secao-guia", "Guia"],
            ["#contato", "Contato"],
          ].map(([href, rotulo]) => (
            <a
              key={href}
              href={href}
              className={cn(
                classesChip(),
                "min-h-toque justify-center no-underline",
              )}
            >
              {rotulo}
            </a>
          ))}
        </nav>
      </BlocoFamPortal>

      <div className="tablet:grid-cols-2 grid grid-cols-1 gap-[11px]">
        <div className={cn(CAIXA, "p-3")}>
          <Eyebrow className="mb-1.5 block">Próxima visita</Eyebrow>
          {proxima ? (
            <>
              <b className="text-sm">
                Dia {proxima.dia}
                {ac ? ` de ${ac.diasContratados}` : ""}
                {", "}
                <span className="font-mono">
                  {formatarData(proxima.data)}
                  {proxima.hora ? ` · ${proxima.hora}` : ""}
                </span>
              </b>
              <p className="text-tinta-50 mt-[3px] text-[11.5px]">
                {feitas} {feitas === 1 ? "visita feita" : "visitas feitas"}
                {ac ? ` de ${ac.diasContratados}` : ""}
              </p>
            </>
          ) : (
            <p className="text-tinta-50 text-[11.5px]">{t.visitas_vazio}</p>
          )}
        </div>
        <div id="secao-enfermeira" className={cn(CAIXA, "scroll-mt-4 p-3")}>
          <Eyebrow className="mb-1.5 block">
            {t.enfermeira_titulo ?? "Minha equipe"}
          </Eyebrow>
          <div className="mb-1.5 flex items-center gap-[7px]">
            {portal.enfermeira?.fotoPath && portal.enfermeira.nome ? (
              <Image
                src="/familia/foto"
                alt={`Foto de ${portal.enfermeira.nome}`}
                width={24}
                height={24}
                unoptimized
                className="size-6 rounded-full object-cover"
              />
            ) : portal.enfermeira?.nome ? (
              <Avatar
                nome={portal.enfermeira.nome}
                className="size-6 text-[9.5px]"
              />
            ) : (
              <UserRound
                className="text-marinho-62 size-6"
                aria-hidden="true"
                strokeWidth={1.5}
              />
            )}
            <span className="text-[11.5px]">
              {portal.enfermeira === null
                ? t.enfermeira_sem_designacao
                : (portal.enfermeira.nome ?? t.enfermeira_sem_nome)}
            </span>
          </div>
          {portal.contato.nome ? (
            <div className="flex items-center gap-[7px]">
              <Avatar
                nome={portal.contato.nome}
                className="bg-marinho-claro text-texto-inverso size-6 text-[9.5px]"
              />
              <span className="text-[11.5px]">
                <b>{portal.contato.nome}</b>
                {portal.contato.funcao ? (
                  <>
                    <br />
                    {portal.contato.funcao}
                  </>
                ) : null}
              </span>
            </div>
          ) : null}
        </div>
      </div>

      <Secao
        id="passos"
        descricao={DESCRICAO.passos}
        titulo={t.passos_titulo ?? "Seus próximos passos"}
      >
        <ol className={CAIXA}>
          {passos.map((p) => (
            <ItemPasso key={p.chave} passo={p} />
          ))}
        </ol>
      </Secao>

      {datas.length > 0 ? (
        <Secao
          id="datas"
          descricao={DESCRICAO.datas}
          titulo={t.datas_titulo ?? "Datas"}
        >
          <dl className={CAIXA}>
            {datas.map((x) => (
              <div
                key={x.chave}
                className="border-fio-3 flex items-center gap-[11px] border-b px-4 py-[11px] last:border-b-0"
              >
                <dt className="flex-1 text-[12.5px] font-semibold">
                  {x.rotulo}
                </dt>
                <dd className="font-mono text-[12.5px]">
                  {formatarData(x.valor)}
                </dd>
                <Selo
                  variante={x.marca === "estimativa" ? "neutro" : "sucesso"}
                >
                  {x.marca === "estimativa" ? "Estimativa" : "Confirmado"}
                </Selo>
              </div>
            ))}
          </dl>
          <Nota className="mt-2.5 text-[11.5px]">{t.dpp_nota}</Nota>
        </Secao>
      ) : null}

      <Secao
        id="visitas"
        descricao={DESCRICAO.visitas}
        titulo={t.visitas_titulo ?? "Visitas em casa"}
      >
        {portal.visitas.length === 0 ? (
          <p className={cn(CAIXA, "text-corpo p-4")}>{t.visitas_vazio}</p>
        ) : (
          <ul className={CAIXA}>
            {portal.visitas.map((v) => (
              <Linha
                key={v.dia}
                className={
                  v.dia === proximaVisita ? "bg-dourado-lavado" : undefined
                }
                icone={v.feita ? <Check /> : <House />}
                titulo={`Dia ${v.dia}${ac ? ` de ${ac.diasContratados}` : ""}`}
                apoio={
                  <span className="font-mono">
                    {formatarData(v.data)}
                    {v.hora ? `, ${v.hora}` : ""}
                  </span>
                }
                selo={
                  <Selo
                    variante={
                      v.feita
                        ? "sucesso"
                        : v.dia === proximaVisita
                          ? "aviso"
                          : "neutro"
                    }
                  >
                    {v.feita
                      ? "Feita"
                      : v.dia === proximaVisita
                        ? "Próxima visita"
                        : "Marcada"}
                  </Selo>
                }
              />
            ))}
          </ul>
        )}
      </Secao>

      <Secao
        id="guia"
        descricao={DESCRICAO.guia}
        titulo={t.guia_titulo ?? "Guia de início"}
      >
        <p className={cn(CAIXA, "text-corpo p-4")}>{t.guia_inicio}</p>
      </Secao>

      {portal.evolucoes.ativo ? (
        <Secao
          id="evolucoes"
          descricao={DESCRICAO.evolucoes}
          titulo={t.evolucoes_titulo ?? "Evoluções de enfermagem"}
        >
          {portal.evolucoes.itens.length === 0 ? (
            <p className={cn(CAIXA, "text-corpo p-4")}>{t.evolucoes_vazio}</p>
          ) : (
            <ul className={CAIXA}>
              {portal.evolucoes.itens.map((e) => (
                <Linha
                  key={e.id}
                  icone={<ClipboardList />}
                  titulo={
                    e.tipo === "neonatal"
                      ? "Evolução do bebê"
                      : "Evolução da mãe"
                  }
                  apoio={
                    e.enviadoEm ? (
                      <>
                        Enviada em{" "}
                        <span className="font-mono">
                          {formatarData(e.enviadoEm)}
                        </span>
                      </>
                    ) : null
                  }
                />
              ))}
            </ul>
          )}
        </Secao>
      ) : null}

      <Secao
        id="pesquisa"
        descricao={DESCRICAO.pesquisa}
        titulo={t.pesquisa_titulo ?? "Sua opinião"}
      >
        <p className={cn(CAIXA, "text-corpo p-4")}>
          {portal.pesquisa?.respondida
            ? t.pesquisa_respondida
            : portal.pesquisa?.enviada
              ? t.pesquisa_enviada
              : t.pesquisa_espera}
        </p>
      </Secao>

      <section
        id="contato"
        aria-labelledby="contato-titulo"
        className="scroll-mt-4"
      >
        <h2 id="contato-titulo" className="mb-2">
          <Eyebrow>{t.contato_titulo ?? "Fale com a equipe"}</Eyebrow>
        </h2>
        <div className={cn(CAIXA, "flex flex-col gap-3 p-4")}>
          <ContatoDaEquipe contato={portal.contato} forte={false} />
          <p className="text-tinta-70 max-w-[56ch] text-[12.5px]">
            {t.contato_apoio}
          </p>
        </div>
      </section>

      <div className="border-linha bg-creme fixed inset-x-0 bottom-0 z-10 border-t px-4 py-2">
        <a
          href={
            portal.contato.telefoneE164
              ? `tel:${portal.contato.telefoneE164}`
              : "#contato"
          }
          className="bg-marinho text-texto-inverso min-h-toque max-w-leitura mx-auto flex w-full items-center justify-center gap-2 rounded-[8px] px-[22px] text-sm font-medium no-underline"
        >
          <Phone className="size-5" aria-hidden="true" strokeWidth={1.75} />
          {t.contato_titulo ?? "Fale com a equipe"}
        </a>
      </div>
    </>
  );
}

function SoContato({
  portal,
}: {
  portal: Exclude<PortalFamilia, { situacao: "ok" }>;
}) {
  const t = portal.textos;
  // Família em pausa (freio, perda): creme e branco, sem tom de apoio e sem
  // bloco forte (DESIGN.md 11.8). Só quem está com eles e como falar.
  return (
    <>
      <header className="flex flex-col gap-3">
        <h1 className="font-titulo text-1 text-texto font-normal">
          {t.titulo}
        </h1>
        <p className="text-3 text-texto max-w-[56ch]">{t.texto}</p>
      </header>
      <section aria-labelledby="contato" className="flex flex-col gap-3">
        <h2 id="contato" className="font-titulo text-2 text-texto font-medium">
          {t.contato_titulo ?? "Quem está com vocês"}
        </h2>
        <div className="rounded-3 bg-superficie border-linha border p-5">
          <ContatoDaEquipe contato={portal.contato} forte={false} />
        </div>
      </section>
    </>
  );
}

export function PortalFamiliaTela({
  portal,
  hoje,
}: {
  portal: PortalFamilia;
  hoje: string;
}) {
  return (
    <div
      className={cn("flex flex-col gap-8", portal.situacao === "ok" && "pb-20")}
      data-portal={portal.situacao}
    >
      {portal.situacao === "ok" ? (
        <Completo portal={portal} hoje={hoje} />
      ) : (
        <SoContato portal={portal} />
      )}
      <BotaoSair />
    </div>
  );
}
