import type { ReactNode } from 'react'
import { Check } from 'lucide-react'
import { RegistroLumi } from './RegistroLumi'
import { CharacterAvatar } from '@/components/student/CharacterAvatar'
import { PasoAnterior } from '../PasoAnterior'
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
  onAnterior,
  etiqueta,
  salida,
  children,
}: {
  hablanteId?: string
  // Sin mensaje (en la consulta, un ítem sin pista), Lumi no habla: solo su avatar.
  mensaje?: string
  consigna: string
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
      {mensaje ? (
        <RegistroLumi hablanteId={hablanteId} texto={mensaje} />
      ) : (
        <CharacterAvatar id={hablanteId ?? 'companero'} size="sm" />
      )}
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
      <div className="sx-player-actions sx-step-footer">
        {onAnterior && <PasoAnterior disabled={ocupado} onClick={onAnterior} />}
        {salida ?? (
          <button type="submit" className="sx-primary-button" disabled={ocupado}>
            {ocupado ? 'Guardando…' : (etiqueta ?? (ultimo ? 'Entregar' : 'Guardar y continuar'))}
            <Check size={18} />
          </button>
        )}
      </div>
    </form>
  )
}
