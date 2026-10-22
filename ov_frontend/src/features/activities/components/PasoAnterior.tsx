import { ArrowLeft } from 'lucide-react'

// «Anterior» del reproductor (F01): secundario y a la izquierda del botón principal, como en la ayuda de Lumi.
export function PasoAnterior({ onClick, disabled }: { onClick: () => void; disabled?: boolean }) {
  return (
    <button
      type="button"
      className="sx-secondary-button"
      disabled={disabled}
      onClick={(event) => {
        event.stopPropagation()
        onClick()
      }}
    >
      <ArrowLeft size={18} /> Anterior
    </button>
  )
}
