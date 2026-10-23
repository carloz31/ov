import { Link } from 'react-router'
import { ChevronRight, LockKeyhole, Target } from 'lucide-react'
import { discoveryPaths } from '@/routes/discoveryPaths'
import { studentActivitiesPath } from '../lib/navigation'
import type { SiguientePaso } from '../lib/siguientePaso'

// Solo api: el siguiente paso de la ruta y cuántas actividades hay disponibles en total.
// `paso` nulo: el servidor aún no entrega la ruta.
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
  return (
    <section className="sx-panel-section">
      {!paso ? (
        <>
          <h2>Siguiente paso</h2>
          <p className="sx-panel-subtitle">No hay actividades por realizar en esta zona por ahora.</p>
        </>
      ) : 'punto' in paso ? (
        <button type="button" className="sx-next-step" data-estado={paso.estado} onClick={onAbrir}>
          <span>
            <span className="sx-next-label">
              {paso.estado === 'bloqueada' ? (
                <LockKeyhole className="sx-next-target" size={24} aria-hidden="true" />
              ) : (
                <Target className="sx-next-target" size={24} aria-hidden="true" />
              )}
              {paso.estado === 'empezada' ? 'Continúa' : 'Siguiente paso'}
            </span>
            {saludo && <small className="sx-panel-return">¡Qué bueno verte de nuevo!</small>}
            <strong>{paso.punto.title}</strong>
            <small className="sx-next-meta">
              {paso.estado === 'bloqueada' ? paso.mensaje : paso.punto.subtitle}
            </small>
          </span>
          <ChevronRight size={22} aria-hidden="true" />
        </button>
      ) : paso.estado === 'completado' ? (
        <>
          <h2>Completaste el camino</h2>
          <p className="sx-panel-subtitle">Aún quedan actividades por descubrir. Sigue explorando.</p>
        </>
      ) : (
        <>
          <h2>Recorriste todo el camino</h2>
          <Link className="sx-panel-link" to={discoveryPaths.helena}>
            Ir al libro de Helena
          </Link>
        </>
      )}
      {/* Siempre lleva a «Mis actividades», también sin nada disponible (ahí están las realizadas). */}
      <Link className="sx-panel-link sx-next-more" to={studentActivitiesPath}>
        {disponibles === 0
          ? 'Ver todas mis actividades ›'
          : `${disponibles === 1 ? '1 actividad disponible' : `${disponibles} actividades disponibles`} · Ver todas ›`}
      </Link>
    </section>
  )
}
