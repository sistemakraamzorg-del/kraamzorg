import Link from "next/link";
import { ChevronDown } from "lucide-react";
import { Selo } from "@/components/ui/selo";
import type { RadarFamilia, RadarNasceu } from "@/lib/dados/tipos-operacao";
import { formatarData } from "@/lib/formatacao";
import { cn } from "@/lib/utils";
import { fraseDias, ROTULO_STATUS_DESIGNACAO } from "../../comum/rotulos";
import { pontosDeAtencao } from "../agrupar";

const ACAO =
  "text-corpo text-texto inline-flex min-h-11 items-center px-3 font-semibold underline underline-offset-2";

function Grupo({
  id,
  titulo,
  contagem,
  aberto,
  children,
}: {
  id: string;
  titulo: string;
  contagem: number;
  aberto?: boolean;
  children: React.ReactNode;
}) {
  if (contagem === 0) return null;
  return (
    <details
      id={id}
      open={aberto}
      className="rounded-3 bg-branco border-linha group border"
    >
      <summary className="font-titulo text-2 text-texto flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 px-4 py-2 font-medium">
        <span className="flex items-center gap-2">
          {titulo}
          <span className="bg-areia-clara text-dado rounded-pilula px-2 font-mono">
            {contagem}
          </span>
        </span>
        <ChevronDown
          aria-hidden="true"
          className="size-5 transition-transform group-open:rotate-180"
        />
      </summary>
      <ul className="border-linha divide-linha divide-y border-t">
        {children}
      </ul>
    </details>
  );
}

function ItemFamilia({ f }: { f: RadarFamilia }) {
  const pontos = pontosDeAtencao(f);
  const quem = (rot: string, d: RadarFamilia["titular"]) =>
    d && !["recusada", "expirada", "cancelada"].includes(d.status)
      ? `${rot}: ${d.nome} (${ROTULO_STATUS_DESIGNACAO[d.status].toLowerCase()})`
      : `${rot}: ninguém ainda`;
  return (
    <li className="flex flex-wrap items-center gap-x-4 gap-y-1 px-4 py-2">
      <div className="flex min-w-0 flex-1 basis-60 flex-col">
        <span className="text-corpo text-texto font-semibold">
          {f.nome}
          {f.gemelar ? " (gemelar)" : ""}
        </span>
        <span className="text-mini text-texto-2">
          <span className="text-dado font-mono">{f.ig}</span>
          {` · data provável ${formatarData(f.dpp) ?? f.dpp}, ${fraseDias(f.diasParaDpp)} (estimativa)`}
          {f.regiao ? ` · ${f.regiao}` : ""}
        </span>
        <span className="text-mini text-texto-2">
          {quem("Titular", f.titular)}. {quem("Backup", f.backup)}.
        </span>
      </div>
      <ul
        className="flex flex-1 basis-60 flex-wrap gap-1.5"
        aria-label="Pontos de atenção"
      >
        {pontos.length === 0 ? (
          <li className="text-mini text-texto-2">Nada pendente.</li>
        ) : (
          pontos.map((p) => (
            <li key={p.chave}>
              <Selo
                variante={
                  p.tom === "alerta"
                    ? "alerta"
                    : p.tom === "aviso"
                      ? "aviso"
                      : "neutro"
                }
                className="py-1 leading-snug whitespace-normal"
              >
                {p.texto}
              </Selo>
            </li>
          ))
        )}
      </ul>
      <Link href={`/radar/${f.familiaId}`} className={cn(ACAO)}>
        Abrir alocação
      </Link>
    </li>
  );
}

function ItemNasceu({ n }: { n: RadarNasceu }) {
  return (
    <li className="flex flex-wrap items-center gap-x-4 gap-y-1 px-4 py-2">
      <div className="flex min-w-0 flex-1 basis-60 flex-col">
        <span className="text-corpo text-texto font-semibold">{n.nome}</span>
        <span className="text-mini text-texto-2">
          {`Nasceu em ${formatarData(n.dataNascimento) ?? n.dataNascimento}. `}
          {n.previsaoAlta
            ? `Alta prevista para ${formatarData(n.previsaoAlta) ?? n.previsaoAlta} (estimativa).`
            : "Sem previsão de alta ainda."}
          {n.titular ? ` Titular: ${n.titular}.` : " Sem titular."}
        </span>
      </div>
      <Link href={`/radar/${n.familiaId}`} className={ACAO}>
        Registrar a alta
      </Link>
    </li>
  );
}

/** Tudo o que o radar mostrava em cartões, agora em listas compactas recolhíveis. */
export function ListasDoRadar({
  naJanela,
  passaram,
  adiante,
  nasceram,
}: {
  naJanela: RadarFamilia[];
  passaram: RadarFamilia[];
  adiante: RadarFamilia[];
  nasceram: RadarNasceu[];
}) {
  return (
    <div className="flex flex-col gap-3">
      <Grupo
        id="na-janela"
        titulo="Na janela do parto"
        contagem={naJanela.length}
        aberto
      >
        {naJanela.map((f) => (
          <ItemFamilia key={f.familiaId} f={f} />
        ))}
      </Grupo>
      <Grupo
        id="passaram"
        titulo="Passaram da janela sem nascimento registrado"
        contagem={passaram.length}
        aberto
      >
        {passaram.map((f) => (
          <ItemFamilia key={f.familiaId} f={f} />
        ))}
      </Grupo>
      <Grupo
        id="adiante"
        titulo="Nas próximas semanas"
        contagem={adiante.length}
      >
        {adiante.map((f) => (
          <ItemFamilia key={f.familiaId} f={f} />
        ))}
      </Grupo>
      <Grupo
        id="nasceram"
        titulo="Já nasceram, aguardando a alta"
        contagem={nasceram.length}
        aberto
      >
        {nasceram.map((n) => (
          <ItemNasceu key={n.familiaId} n={n} />
        ))}
      </Grupo>
    </div>
  );
}
