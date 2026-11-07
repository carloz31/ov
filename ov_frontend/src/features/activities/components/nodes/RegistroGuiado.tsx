import type { ReactNode } from 'react'
import { Check } from 'lucide-react'
import { RegistroPersonaje } from './RegistroPersonaje'
import { PasoAnterior } from '../PasoAnterior'
import { LEYENDA_ITEM } from '../../lib/presentacionItem'
import '../../styles/registro-guiado.css'

// Marco común de un ítem de registro (ajuste vista del ítem): el personaje con lo fijo del ítem; el contenido (la
// zona del eco y los bloques de elección y de texto, ya en el orden del nodo); el error del servidor y el pie con
// la leyenda a la izquierda y el botón de avanzar, que nunca se deshabilita por validación.
export function RegistroGuiado({
  hablanteId,
  dialogo,
  ultimo,
  ocupado,
  error,
  onEnviar,
  onAnterior,
  etiqueta,
  salida,
  children,
}: {
  hablanteId?: string
  dialogo?: string
  ultimo: boolean
  ocupado: boolean
  error: string
  onEnviar: () => void
  onAnterior?: () => void
  // Consulta de un registro entregado (F02): el texto del botón y, si no hay cambios en
  // la última consigna, la salida de la pantalla de fin en lugar del botón.
  etiqueta?: string
  salida?: ReactNode
  children: ReactNode
}) {
  return (
    <form
      className="sx-submission-form sx-guided-form"
      onSubmit={(event) => {
        event.preventDefault()
        onEnviar()
      }}
    >
      <RegistroPersonaje hablanteId={hablanteId} texto={dialogo} />
      {children}
      {error && (
        <p role="alert" className="sx-submission-error">
          {error}
        </p>
      )}
      <div className="sx-player-actions sx-step-footer sx-item-pie">
        <span className="sx-item-leyenda">{LEYENDA_ITEM}</span>
        <div className="sx-item-acciones">
          {onAnterior && <PasoAnterior disabled={ocupado} onClick={onAnterior} />}
          {salida ?? (
            <button type="submit" className="sx-primary-button" disabled={ocupado}>
              {ocupado ? 'Guardando…' : (etiqueta ?? (ultimo ? 'Entregar' : 'Siguiente'))}
              <Check size={18} />
            </button>
          )}
        </div>
      </div>
    </form>
  )
}
