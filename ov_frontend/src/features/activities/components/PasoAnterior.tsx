import { ArrowLeft } from 'lucide-react'

// «Anterior» del reproductor (F01): secundario y a la izquierda del botón principal, como en la ayuda de Lumi.
// En móvil, si no cabe, queda solo la flecha (el aria-label conserva el nombre).
export function PasoAnterior({ onClick, disabled }: { onClick: () => void; disabled?: boolean }) {
  return (
    <button
      type="button"
      className="sx-secondary-button sx-prev-button"
      aria-label="Anterior"
      disabled={disabled}
      onClick={(event) => {
        event.stopPropagation()
        onClick()
      }}
    >
      <ArrowLeft size={18} aria-hidden="true" /> <span className="sx-prev-label">Anterior</span>
    </button>
  )
}
