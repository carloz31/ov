import { useEffect, useRef, useState, type ReactNode } from 'react'
import { X, type LucideIcon } from 'lucide-react'

const DURACION = 6000

// Aviso compacto del estudiante, al estilo de un toast: ícono del tipo, etiqueta, título, una línea de
// descripción, una acción y la X (descripción y acción son opcionales: el aviso de guardado del diario no las
// necesita siempre). Se cierra a los 6 s, o a los `duracion` ms; el tiempo se pausa con el puntero o el foco
// dentro. Con `parrafo`, la descripción se lee completa en lugar de cortarse en una línea.
export function AvisoToast({
  icono: Icono,
  etiqueta,
  titulo,
  descripcion,
  accion,
  onDismiss,
  duracion = DURACION,
  parrafo = false,
}: {
  icono: LucideIcon
  etiqueta?: string
  titulo: string
  descripcion?: string
  accion?: ReactNode
  onDismiss: () => void
  duracion?: number
  parrafo?: boolean
}) {
  const dismiss = useRef(onDismiss)
  dismiss.current = onDismiss
  const [pausado, setPausado] = useState(false)
  const restante = useRef(duracion)
  useEffect(() => {
    if (pausado) return
    const inicio = Date.now()
    const temporizador = setTimeout(() => dismiss.current(), restante.current)
    return () => {
      clearTimeout(temporizador)
      restante.current = Math.max(0, restante.current - (Date.now() - inicio))
    }
  }, [pausado])
  return (
    <aside
      className="sx-root sx-glass sx-badge-toast"
      role="status"
      aria-live="polite"
      onMouseEnter={() => setPausado(true)}
      onMouseLeave={() => setPausado(false)}
      onFocus={() => setPausado(true)}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setPausado(false)
      }}
    >
      <span className="sx-toast-icon" aria-hidden="true">
        <Icono size={18} />
      </span>
      <div className="sx-badge-copy">
        {etiqueta && <p className="sx-badge-label">{etiqueta}</p>}
        <h2>{titulo}</h2>
        {descripcion &&
          (parrafo ? (
            <p className="sx-toast-parrafo">{descripcion}</p>
          ) : (
            <p className="sx-toast-linea" title={descripcion}>
              {descripcion}
            </p>
          ))}
        {accion}
      </div>
      <button
        type="button"
        className="sx-badge-close sx-icon-button"
        aria-label="Cerrar aviso"
        onClick={onDismiss}
      >
        <X size={18} aria-hidden="true" />
      </button>
    </aside>
  )
}
