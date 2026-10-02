/**
 * Carregando o painel da Isadora: a faixa de números e os painéis, no
 * mesmo cartão branco com fio fino das outras telas de gestão.
 */
export default function CarregandoAgente() {
  return (
    <div
      role="status"
      aria-label="Carregando o painel da Isadora"
      className="flex flex-col gap-6 pt-2 motion-safe:animate-pulse"
    >
      <div className="bg-marinho-14 rounded-pilula h-8 w-32" />
      <div className="tablet:grid-cols-2 grid grid-cols-1 gap-3 lg:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="bg-areia-clara rounded-3 h-28" />
        ))}
      </div>
      <div className="bg-areia-clara rounded-3 h-56" />
      <div className="bg-areia-clara rounded-3 h-40" />
    </div>
  );
}
