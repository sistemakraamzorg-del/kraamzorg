import { horaEmBrasilia } from "@/lib/agenda/datas";

/**
 * Contas do horário de chegada e saída no cabeçalho do checklist. Puras:
 * a hora vem do aparelho ou do servidor e a duração prevista vem da visita
 * (pacote), nunca de número fixo aqui.
 */

/** "08:30" no dia aaaa-mm-dd, em Brasília, como instante. Nulo se inválido. */
export function instanteEmBrasilia(data: string, hhmm: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(data) || !/^\d{2}:\d{2}$/.test(hhmm)) {
    return null;
  }
  const chute = new Date(`${data}T${hhmm}:00Z`);
  const visto = horaEmBrasilia(chute);
  if (Number.isNaN(chute.getTime()) || !visto) return null;
  const minutos = (t: string) =>
    Number(t.slice(0, 2)) * 60 + Number(t.slice(3));
  let diff = minutos(visto) - minutos(hhmm);
  if (diff > 720) diff -= 1440;
  if (diff < -720) diff += 1440;
  return new Date(chute.getTime() - diff * 60_000);
}

/** Minutos entre chegada e saída, ou nulo se faltar uma ponta ou for negativo. */
export function minutosFeitos(
  chegada: string | null,
  saida: string | null,
): number | null {
  if (!chegada || !saida) return null;
  const m = (new Date(saida).getTime() - new Date(chegada).getTime()) / 60_000;
  return Number.isFinite(m) && m >= 0 ? Math.round(m) : null;
}

/** 190 vira "3h10"; 180 vira "3h"; 45 vira "45min". */
export function duracaoEmTexto(minutos: number): string {
  const h = Math.floor(minutos / 60);
  const m = minutos % 60;
  if (h === 0) return `${m}min`;
  return m === 0 ? `${h}h` : `${h}h${String(m).padStart(2, "0")}`;
}

/** "3 horas previstas, 3h10 feitas". Só diz o que sabe. */
export function resumoDoIntervalo(
  horasPrevistas: number | null | undefined,
  feitos: number | null,
): string | null {
  const previstas =
    horasPrevistas && horasPrevistas > 0
      ? `${horasPrevistas} ${horasPrevistas === 1 ? "hora prevista" : "horas previstas"}`
      : null;
  const feitas = feitos === null ? null : `${duracaoEmTexto(feitos)} feitas`;
  return [previstas, feitas].filter(Boolean).join(", ") || null;
}
