import type { ReactNode } from 'react'
import { ArrowRight, Check } from 'lucide-react'
import { RegistroPersonaje } from './RegistroPersonaje'
import { PasoAnterior } from '../PasoAnterior'
import { LEYENDA_ITEM } from '../../lib/presentacionItem'
import { BOTONES } from '../../lib/textosRegistro'
import '../../styles/registro-guiado.css'

// Marco común de un ítem de registro (ajuste vista del ítem; ajuste front de registros, lote 1): el personaje del
// nodo con el diálogo del ítem, el contenido, el error del servidor y el pie, donde solo se navega: la leyenda a la
// izquierda y, a la derecha, «Anterior» (o «Cancelar», en edición) y el botón principal («Enviar» o «Continuar»).
// Lote 2: a la izquierda la acción de volver, discreta; a la derecha la principal; debajo, la leyenda.
export function RegistroGuiado({
  hablanteId,
  dialogo,
  ocupado,
  error,
  onEnviar,
  deshabilitado = false,
  onAnterior,
  onCancelar,
  etiqueta = BOTONES.enviar,
  ecos,
  children,
}: {
  hablanteId?: string
  dialogo?: string | null
  ocupado: boolean
  error: string
  onEnviar: () => void
  deshabilitado?: boolean
  onAnterior?: () => void
  onCancelar?: () => void
  etiqueta?: string
  // Lote 2 (§1, §3): los ecos del ítem van arriba de la burbuja del personaje.
  ecos?: ReactNode
  children: ReactNode
}) {
  const enviar = etiqueta === BOTONES.enviar
  return (
    <form
      className="sx-submission-form sx-guided-form"
      onSubmit={(event) => {
        event.preventDefault()
        if (!ocupado && !deshabilitado) onEnviar()
      }}
    >
      {ecos}
      <RegistroPersonaje hablanteId={hablanteId} texto={dialogo ?? undefined} />
      {children}
      {error && (
        <p role="alert" className="sx-submission-error">
          {error}
        </p>
      )}
      <div className="sx-player-actions sx-step-footer sx-item-pie">
        <span className="sx-item-volver">
          {onCancelar ? (
            <button type="button" className="sx-secondary-button" disabled={ocupado} onClick={onCancelar}>
              {BOTONES.cancelar}
            </button>
          ) : (
            onAnterior && <PasoAnterior disabled={ocupado} onClick={onAnterior} />
          )}
        </span>
        <button type="submit" className="sx-primary-button" disabled={ocupado || deshabilitado}>
          {etiqueta}
          {enviar ? <Check size={18} /> : <ArrowRight size={18} />}
        </button>
      </div>
      <span className="sx-item-leyenda">{LEYENDA_ITEM}</span>
    </form>
  )
}
