import type { FiltroPeriodo } from "@/lib/dados/tipos-relacao";
import { hojeBrasilia } from "@/modules/crm/pipeline/idade-gestacional";

const DATA = /^\d{4}-\d{2}-\d{2}$/;

/** Período dos parâmetros de busca; data que não é data vira "sem limite". */
export function periodoDaBusca(busca: {
  desde?: string;
  ate?: string;
}): FiltroPeriodo {
  return {
    desde: busca.desde && DATA.test(busca.desde) ? busca.desde : null,
    ate: busca.ate && DATA.test(busca.ate) ? busca.ate : null,
  };
}

/** Primeiro e último dia do mês de hoje e do mês passado, para os atalhos. */
export function atalhosDePeriodo(hoje = hojeBrasilia()) {
  const [ano, mes] = hoje.split("-").map(Number) as [number, number];
  const ultimo = (a: number, m: number) =>
    new Date(Date.UTC(a, m, 0)).getUTCDate();
  const dois = (n: number) => String(n).padStart(2, "0");
  const anterior = mes === 1 ? { a: ano - 1, m: 12 } : { a: ano, m: mes - 1 };
  return {
    esteMes: {
      desde: `${ano}-${dois(mes)}-01`,
      ate: `${ano}-${dois(mes)}-${dois(ultimo(ano, mes))}`,
    },
    mesPassado: {
      desde: `${anterior.a}-${dois(anterior.m)}-01`,
      ate: `${anterior.a}-${dois(anterior.m)}-${dois(ultimo(anterior.a, anterior.m))}`,
    },
  };
}

const DIA_MS = 86_400_000;
const paraIso = (ms: number) => new Date(ms).toISOString().slice(0, 10);

/**
 * Período imediatamente anterior, com o mesmo número de dias, para comparar.
 * Sem as duas pontas não há como medir o tamanho do período: devolve nulo.
 */
export function periodoAnterior(p: FiltroPeriodo): FiltroPeriodo | null {
  if (!p.desde || !p.ate) return null;
  const desde = Date.parse(p.desde);
  const ate = Date.parse(p.ate);
  if (Number.isNaN(desde) || Number.isNaN(ate) || ate < desde) return null;
  const dias = Math.round((ate - desde) / DIA_MS) + 1;
  return {
    desde: paraIso(desde - dias * DIA_MS),
    ate: paraIso(desde - DIA_MS),
  };
}
