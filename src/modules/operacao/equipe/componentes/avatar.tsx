import { cn } from "@/lib/utils";

/** Iniciais do nome, no máximo duas (`.av` do mockup). */
export function iniciais(nome: string): string {
  const partes = nome.trim().split(/\s+/).filter(Boolean);
  const duas = [partes[0], partes.length > 1 ? partes[partes.length - 1] : ""];
  return duas
    .map((p) => p?.[0] ?? "")
    .join("")
    .toUpperCase();
}

export function Avatar({
  nome,
  className,
}: {
  nome: string;
  className?: string;
}) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "bg-dourado-2 text-marinho grid size-[30px] flex-none place-items-center rounded-full text-[11px] font-semibold",
        className,
      )}
    >
      {iniciais(nome)}
    </span>
  );
}
