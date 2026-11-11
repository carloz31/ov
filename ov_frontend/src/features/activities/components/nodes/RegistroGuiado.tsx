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
      <RegistroPersonaje hablanteId={hablanteId} texto={dialogo ?? undefined} />
      {children}
      {error && (
        <p role="alert" className="sx-submission-error">
          {error}
        </p>
      )}
      <div className="sx-player-actions sx-step-footer sx-item-pie">
        <span className="sx-item-leyenda">{LEYENDA_ITEM}</span>
        <div className="sx-item-acciones">
          {onCancelar ? (
            <button type="button" className="sx-secondary-button" disabled={ocupado} onClick={onCancelar}>
              {BOTONES.cancelar}
            </button>
          ) : (
            onAnterior && <PasoAnterior disabled={ocupado} onClick={onAnterior} />
          )}
          <button type="submit" className="sx-primary-button" disabled={ocupado || deshabilitado}>
            {etiqueta}
            {enviar ? <Check size={18} /> : <ArrowRight size={18} />}
          </button>
        </div>
      </div>
    </form>
  )
}
