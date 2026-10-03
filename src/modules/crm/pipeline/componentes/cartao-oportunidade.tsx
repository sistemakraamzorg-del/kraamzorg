import type { Papel } from "@/lib/auth/papeis";
import { Selo } from "@/components/ui/selo";
import { formatarData, localidade } from "@/lib/formatacao";
import type { EstadoSensivel, NumeroPipeline } from "@/lib/dados/tipos";
import type { CartaoPipelineTela } from "../tipos";
import { ROTULO_ORIGEM_LEAD } from "../estagios";
import { EXPLICA_CLASSIFICACAO } from "./detalhe-oportunidade";
import { MenuMover } from "./menu-mover";
import {
  CLASSE_CARTAO,
  CLASSE_RODAPE,
  ETIQUETA_MIUDA,
  PontuacaoCartao,
} from "./visual-quadro";

const ROTULO_FREIO: Record<Exclude<EstadoSensivel, "normal">, string> = {
  atencao: "Freio em atenção",
  bloqueio_total: "Freio em bloqueio total",
  encerrado_sensivel: "Encerrado em estado sensível",
};

/** "Neste estágio desde hoje" / "Neste estágio há 3 dias" (voz.md, seção 5). */
function fraseNoEstagio(tempo: string): string {
  return tempo === "Hoje"
    ? "Neste estágio desde hoje"
    : `Neste estágio ${tempo.charAt(0).toLowerCase()}${tempo.slice(1)}`;
}

/**
 * Cartão compacto da oportunidade (mockup `v-crm`): linha 1 nome e
 * pontuação, linha 2 semanas e bairro, linha 3 selos (classificação,
 * origem e uma só pendência). Tempo no estágio, próximo contato, DPP e as
 * demais pendências ficam na dica de hover e no painel de detalhes.
 */
export function CartaoOportunidadePipeline({
  cartao,
  pipeline,
  papeis,
  aoAbrir,
}: {
  cartao: CartaoPipelineTela;
  pipeline: NumeroPipeline;
  papeis: readonly Papel[];
  /** Abre o painel de detalhes (clique no cartão ou Enter no nome). */
  aoAbrir?: () => void;
}) {
  const emFreio = cartao.estadoSensivel !== "normal";
  // Perda ou intercorrência (bloqueio total, encerrado sensível): sai a
  // semana da gestação e a palavra de venda (quente, morno, frio) do
  // cartão (DESIGN.md, 11.8 e 11.9).
  const sensivel =
    cartao.estadoSensivel === "bloqueio_total" ||
    cartao.estadoSensivel === "encerrado_sensivel";
  const lugar = localidade(cartao.bairro, cartao.cidade);
  const semanas = !sensivel ? cartao.idadeGestacional : null;

  // Uma só pendência no cartão; o resto vai na dica e nos detalhes.
  const pendencia =
    cartao.estadoSensivel !== "normal"
      ? ({
          texto: ROTULO_FREIO[cartao.estadoSensivel],
          variante: "sensivel",
        } as const)
      : cartao.transferenciaAberta
        ? ({ texto: "Transferência aberta", variante: "aviso" } as const)
        : cartao.pdfEnviadoEm
          ? ({ texto: "Apresentação enviada", variante: "neutro" } as const)
          : null;

  const origemTexto =
    cartao.origem && cartao.origem !== "desconhecida"
      ? ROTULO_ORIGEM_LEAD[cartao.origem]
      : null;

  const dica = [
    fraseNoEstagio(cartao.tempoNoEstagio),
    cartao.dpp && !sensivel
      ? `DPP ${formatarData(cartao.dpp)} (estimativa)`
      : null,
    cartao.pdfEnviadoEm
      ? `Apresentação enviada em ${formatarData(cartao.pdfEnviadoEm)}`
      : null,
    cartao.transferenciaAberta ? "Transferência aberta" : null,
    emFreio
      ? sensivel
        ? "Nenhuma mensagem automática sai para esta família"
        : "Conteúdo e marketing pausados; os avisos da operação continuam"
      : cartao.proximoContatoEm
        ? `Próximo contato em ${formatarData(cartao.proximoContatoEm)}`
        : null,
  ]
    .filter(Boolean)
    .join(". ");

  return (
    <div
      title={dica}
      // Clique em área livre do cartão abre os detalhes; botões e menus
      // dentro dele seguem com a própria ação. Teclado: botão do nome.
      onClick={(e) => {
        if (!(e.target as HTMLElement).closest("button, a, [role=menuitem]"))
          aoAbrir?.();
      }}
      // O cartão com freio usa o ameixa lavado, nunca areia (areia é da
      // família e da Isadora).
      className={`${CLASSE_CARTAO} ${aoAbrir ? "cursor-pointer" : ""} ${
        emFreio ? "bg-sensivel-lavado border-sensivel-borda" : ""
      }`}
    >
      <div className="flex items-center gap-1.5">
        <button
          type="button"
          onClick={aoAbrir}
          aria-label={`Ver detalhes de ${cartao.nomeFamilia}`}
          className="min-h-toque min-w-0 flex-1 truncate text-left text-[12.5px] font-semibold underline-offset-4 hover:underline lg:min-h-6"
        >
          {cartao.nomeFamilia}
        </button>
        <div className="relative flex-none">
          <MenuMover
            cartao={cartao}
            pipeline={pipeline}
            papeis={papeis}
            compacto
          />
        </div>
      </div>
      {semanas || lugar ? (
        <p className="text-tinta-50 mt-[3px] flex flex-wrap gap-1.5 text-[11px]">
          {semanas ? <span className="font-mono">{semanas}</span> : null}
          {semanas && lugar ? <span aria-hidden="true">·</span> : null}
          {lugar ? <span>{lugar}</span> : null}
        </p>
      ) : null}
      {(!sensivel && cartao.score !== null) || origemTexto || pendencia ? (
        <div className={CLASSE_RODAPE}>
          {!sensivel && cartao.score !== null ? (
            <PontuacaoCartao
              valor={cartao.score}
              classificacao={cartao.classificacao}
              title={
                cartao.classificacao
                  ? `Pontuação ${cartao.score}. ${EXPLICA_CLASSIFICACAO[cartao.classificacao]}`
                  : "Pontuação do lead"
              }
            />
          ) : null}
          {origemTexto ? (
            <Selo title="De onde veio esta família" className={ETIQUETA_MIUDA}>
              {origemTexto}
            </Selo>
          ) : null}
          {pendencia ? (
            <Selo variante={pendencia.variante} className={ETIQUETA_MIUDA}>
              {pendencia.texto}
            </Selo>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
