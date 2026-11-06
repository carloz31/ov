import { Link } from 'react-router'
import { ChevronRight } from 'lucide-react'
import { studentActivitiesPath } from '../lib/navigation'
import type { SiguientePaso } from '../lib/siguientePaso'

// La tarjeta «Siguiente paso» del panel (ajuste del panel, F05: ambos modos; en local, la recomendada).
// `paso` nulo: el servidor aún no entrega la ruta. `disponibles`: abiertas, incluida la del paso si lo está.
export function SiguientePasoServidor({
  paso,
  disponibles,
  saludo,
  onAbrir,
}: {
  paso: SiguientePaso | null
  disponibles: number
  saludo: boolean
  onAbrir?: () => void
}) {
  if (!paso)
    return (
      <section className="sx-panel-section">
        <h2>Siguiente paso</h2>
        <p className="sx-panel-subtitle">No hay misiones por realizar en esta zona por ahora.</p>
      </section>
    )
  // Sin requeridas pendientes: toda la tarjeta lleva a la lista completa y no hay pie.
  if (!('punto' in paso))
    return (
      <section className="sx-panel-section sx-next-card" data-estado={paso.estado}>
        <Link className="sx-next-step" to={studentActivitiesPath}>
          <span>
            <span className="sx-next-label">Siguiente paso</span>
            <strong>Explora las actividades</strong>
          </span>
          <ChevronRight size={22} aria-hidden="true" />
        </Link>
      </section>
    )
  const otras = disponibles - (paso.estado === 'bloqueada' ? 0 : 1)
  const Icono = paso.punto.icon
  return (
    <section className="sx-panel-section sx-next-card" data-estado={paso.estado}>
      <button type="button" className="sx-next-step" onClick={onAbrir}>
        <span>
          <span className="sx-next-label">{paso.estado === 'empezada' ? 'Continúa' : 'Siguiente paso'}</span>
          {saludo && <small className="sx-panel-return">¡Qué bueno verte de nuevo!</small>}
          <strong>{paso.punto.title}</strong>
          <small className="sx-next-meta">
            {Icono && <Icono size={14} aria-hidden="true" />}
            {paso.estado === 'bloqueada' ? paso.mensaje : paso.punto.subtitle}
          </small>
        </span>
        <ChevronRight size={22} aria-hidden="true" />
      </button>
      {/* El enlace siempre lleva a la lista completa; cambia solo el texto de la izquierda. */}
      <div className="sx-next-more">
        <span>
          {otras > 0
            ? `+${otras} ${otras === 1 ? 'misión abierta' : 'misiones abiertas'}`
            : paso.estado !== 'bloqueada' && 'Es tu única misión abierta por ahora'}
        </span>
        <Link className="sx-panel-link" to={studentActivitiesPath}>
          Ver todas ›
        </Link>
      </div>
    </section>
  )
}
