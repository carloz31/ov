import type { ReactNode } from 'react'
import { Check } from 'lucide-react'
import { RegistroLumi } from './RegistroLumi'
import '../../styles/registro-guiado.css'

// Marco común de los registros guiados (podio y elección): Lumi, consigna con su leyenda, el contenido
// propio, el error del servidor y el botón de avanzar, que nunca se deshabilita por validación.
export function RegistroGuiado({
  hablanteId,
  mensaje,
  consigna,
  ultimo,
  ocupado,
  error,
  onEnviar,
  children,
}: {
  hablanteId?: string
  mensaje: string
  consigna: string
  ultimo: boolean
  ocupado: boolean
  error: string
  onEnviar: () => void
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
      <RegistroLumi hablanteId={hablanteId} texto={mensaje} />
      <p className="sx-submission-label">
        <span className="sx-submission-premise">{consigna}</span>
        <span className="sx-submission-visibility">
          Visible para ti y tu orientadora. Se guarda en tu cuenta.
        </span>
      </p>
      {children}
      {error && (
        <p role="alert" className="sx-submission-error">
          {error}
        </p>
      )}
      <div className="sx-player-actions">
        <button type="submit" className="sx-primary-button" disabled={ocupado}>
          {ocupado ? 'Guardando…' : ultimo ? 'Entregar' : 'Guardar y continuar'}
          <Check size={18} />
        </button>
      </div>
    </form>
  )
}
