/**
 * Medidor em meia-lua do mockup (`gauge`): SVG puro, cor viva do tema.
 * `valor` de 0 a 100. O número vai escrito no meio e no rótulo acessível.
 */
export function MedidorAdesao({
  valor,
  legenda,
}: {
  valor: number;
  legenda: string;
}) {
  const v = Math.min(Math.max(Math.round(valor), 0), 100);
  const arco = "M 20 100 A 80 80 0 0 1 180 100";
  return (
    <figure className="flex flex-col items-center">
      <svg
        viewBox="0 0 200 118"
        role="img"
        aria-label={`${v}% ${legenda}`}
        className="w-full max-w-[220px]"
      >
        <path
          d={arco}
          fill="none"
          stroke="var(--areia-clara)"
          strokeWidth="16"
          strokeLinecap="round"
        />
        {v > 0 ? (
          <path
            d={arco}
            pathLength={100}
            fill="none"
            stroke="var(--sucesso-vivo)"
            strokeWidth="16"
            strokeLinecap="round"
            strokeDasharray={`${v} 100`}
          />
        ) : null}
        <text
          x="100"
          y="92"
          textAnchor="middle"
          className="font-titulo"
          fontSize="34"
          fontWeight="300"
          fill="var(--marinho)"
        >
          {v}%
        </text>
      </svg>
      <figcaption className="text-tinta-50 text-[11.5px]">{legenda}</figcaption>
    </figure>
  );
}
