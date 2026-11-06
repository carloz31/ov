import { Link } from 'react-router'
import { CircleCheck, Compass, LockKeyhole } from 'lucide-react'
import { appPaths } from '@/routes/paths'
import type { AccesoSeccion } from '../hooks/useSeccionesAcceso'
import { etiquetaSenal } from '../lib/checkIn'

// Ajuste del panel (F05): «Tu señal de hoy» en tres estados, con una sola acción principal en cada uno.
// Bloqueada, toda la tarjeta abre a Lumi; registrada, «Cambiar» reabre el registro y sobrescribe el del día.
export function SenalHoy({
  valor,
  escala,
  acceso,
  onRegistrar,
  onGuide,
}: {
  valor?: number
  escala: number
  acceso: AccesoSeccion
  onRegistrar: () => void
  onGuide?: (pasos: string[]) => void
}) {
  const titulo = (
    <>
      <Compass size={18} aria-hidden="true" />
      Tu señal de hoy
    </>
  )
  if (acceso.bloqueada)
    return (
      <button
        type="button"
        className="sx-panel-section sx-signal-card"
        data-estado="bloqueada"
        title={acceso.mensaje}
        onClick={acceso.pasos ? () => onGuide?.(acceso.pasos!) : undefined}
      >
        <span className="sx-signal-heading">
          <span className="sx-signal-title">{titulo}</span>
          <LockKeyhole size={16} aria-hidden="true" />
        </span>
        <span className="sx-panel-subtitle">Aún no se abre. Toca para saber cómo</span>
      </button>
    )
  const registrada = valor !== undefined
  return (
    <section className="sx-panel-section sx-signal-card" data-estado={registrada ? 'registrada' : 'disponible'}>
      <div className="sx-signal-heading">
        <h2>{titulo}</h2>
        {registrada && <CircleCheck className="sx-signal-check" size={18} aria-label="Registrada hoy" />}
      </div>
      {!registrada && <p className="sx-panel-subtitle">¿Qué tan seguro te sientes hoy de tu próximo paso?</p>}
      <div
        className="sx-signal-segments"
        style={{ gridTemplateColumns: `repeat(${escala}, minmax(0, 1fr))` }}
        role="progressbar"
        aria-label="Señal de hoy"
        aria-valuemin={0}
        aria-valuemax={escala}
        aria-valuenow={valor ?? 0}
      >
        {Array.from({ length: escala }, (_, i) => (
          <span key={i} data-filled={i < (valor ?? 0)} />
        ))}
      </div>
      {registrada ? (
        <>
          <p className="sx-signal-value-line">
            <span aria-label={`${valor} de ${escala}`}>
              <strong>{etiquetaSenal(valor, escala)}</strong>
              {` · ${valor} de ${escala}`}
            </span>
            <button type="button" className="sx-signal-change" onClick={onRegistrar}>
              Cambiar
            </button>
          </p>
          <Link className="sx-signal-history" data-variante="boton" to={appPaths.student.signals}>
            Ver evolución
          </Link>
        </>
      ) : (
        <>
          <button type="button" className="sx-signal-edit" onClick={onRegistrar}>
            Registrar mi señal
          </button>
          <Link className="sx-signal-history" to={appPaths.student.signals}>
            Ver evolución
          </Link>
        </>
      )}
    </section>
  )
}
