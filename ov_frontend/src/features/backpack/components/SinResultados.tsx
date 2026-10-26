// Ajuste mochila: la búsqueda o «Solo favoritos» no encuentran nada (distinto del compartimento vacío).
export function SinResultados({ texto, onLimpiar }: { texto: string; onLimpiar: () => void }) {
  return (
    <div className="sx-b-empty">
      <p>{texto}</p>
      <button className="sx-d-action sx-d-action-ghost" onClick={onLimpiar} type="button">
        Limpiar filtros
      </button>
    </div>
  )
}
