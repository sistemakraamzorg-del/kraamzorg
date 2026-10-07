import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { z } from "zod";
import { exigirSessao } from "@/lib/auth/sessao";
import { obterRepositorios } from "@/lib/dados/fabrica";
import { baseDoChecklist } from "@/modules/assistencial/checklist/base-do-checklist";
import { TelaChecklist } from "@/modules/assistencial/checklist/tela-checklist";
import { DiaADia } from "@/modules/assistencial/evolucao/componentes/dia-a-dia";

/** O título nunca leva nome de família (DESIGN.md, microcopy 11). */
export const metadata: Metadata = { title: "Checklist · Kraamzorg OS" };

const idVisita = z.uuid();

/**
 * Checklist diário da visita (P39). A enfermeira abre a visita dela; a
 * coordenação e a diretoria leem o registro assinado. Quem confere de quem
 * é a visita é o banco (api.checklist_visita): visita alheia volta vazia e
 * a tela mostra "não encontrada", sem revelar que ela existe.
 */
export default async function PaginaChecklist({
  params,
}: {
  params: Promise<{ visitaId: string }>;
}) {
  const { visitaId } = await params;
  if (!idVisita.safeParse(visitaId).success) notFound();

  const sessao = await exigirSessao("/visita");
  const { assistencial } = await obterRepositorios();
  const checklist = await assistencial.obterChecklist(visitaId);
  if (!checklist) notFound();

  // No fim do checklist já feito: a grade com todos os dias e todas as
  // marcações. A base completa traz a entrada e a saída de cada dia; sem ela
  // (fora do acesso ou sem dado), vale o que o próprio checklist carrega.
  let fimDoChecklist: React.ReactNode = null;
  if (checklist.registro) {
    const { evolucoes } = await obterRepositorios();
    const base = await evolucoes
      .base(checklist.visita.acompanhamentoId)
      .catch(() => baseDoChecklist(checklist));
    fimDoChecklist = <DiaADia base={base} checklistAberto />;
  }

  const enfermeira = sessao.papeis.includes("enfermeira");
  return (
    <TelaChecklist
      checklist={checklist}
      usuarioId={sessao.usuarioId}
      voltarPara={enfermeira ? "/hoje" : "/inicio"}
      fimDoChecklist={fimDoChecklist}
    />
  );
}
