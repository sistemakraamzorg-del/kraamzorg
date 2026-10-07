import { Card, CardBody, CardHead } from "@/components/mockup";
import { Selo } from "@/components/ui/selo";
import type { EstadoSensivel } from "@/lib/dados/tipos";

const SELO: Record<
  EstadoSensivel,
  { rotulo: string; variante: "sucesso" | "sensivel" }
> = {
  normal: {
    rotulo: "Normal, mensagens automáticas ligadas",
    variante: "sucesso",
  },
  atencao: { rotulo: "Freio em atenção", variante: "sensivel" },
  bloqueio_total: { rotulo: "Freio em bloqueio total", variante: "sensivel" },
  encerrado_sensivel: { rotulo: "Encerrado sensível", variante: "sensivel" },
};

/**
 * Cartão "Estado sensível" (mockup, `v-ficha`). Só mostra o estado e explica
 * o freio; o toque que aciona fica no cabeçalho da família, em um toque, em
 * toda aba (PRD 20.4). Quem puxou o freio e quem reverte seguem os mesmos
 * caminhos de antes.
 */
export function PainelEstadoSensivel({ estado }: { estado: EstadoSensivel }) {
  const selo = SELO[estado];
  return (
    <Card>
      <CardHead titulo="Estado sensível" />
      <CardBody>
        <div className="mb-2.5 flex items-center justify-between">
          <Selo variante={selo.variante}>{selo.rotulo}</Selo>
        </div>
        <p className="text-tinta-50 text-[11.5px] leading-[1.65]">
          {estado === "normal"
            ? "Use o botão Freio, no alto da ficha, se houver intercorrência, perda gestacional ou qualquer situação em que nada automático deve sair. Todas as mensagens automáticas param na hora. A justificativa pode ser escrita depois."
            : "As mensagens automáticas desta família estão paradas. Só contato de uma pessoa da equipe, pelo nome. A coordenação e a diretoria podem reverter pelo selo Freio ativo, no alto da ficha."}
        </p>
      </CardBody>
    </Card>
  );
}
