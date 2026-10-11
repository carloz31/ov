import { useState } from 'react'
import { useEstadoServidor } from '@/store/servidor/sesion'
import { CheckCheck, Compass, Footprints, MapPin } from 'lucide-react'
import { Link } from 'react-router'
import { useJourney } from '@/store/journeyStore'
import { useAdventure } from '@/store/adventureStore'
import { DiscoveryStage } from '@/features/discovery/components/DiscoveryStage'
import { Parchment } from '@/components/student/Parchment'
import { getCaminoPoints } from '@/features/adventure/lib/caminoPoints'
import { getCiudadPoints } from '@/features/adventure/lib/ciudadPoints'
import { getPointDetails } from '@/features/adventure/lib/pointDetails'
import { getListedActivities, getPointMapHref } from '@/features/adventure/lib/navigation'
import '@/styles/student/history.css'
import { useReflections } from '@/store/reflectionStore'
export function StudentActivitiesView() {
  useEstadoServidor()
  const adventure = useAdventure()
  const journey = useJourney()
  useReflections()
  const [completed, setCompleted] = useState(false)
  const points = getListedActivities(
    [...getCaminoPoints(adventure, journey), ...getCiudadPoints(adventure, journey)],
    completed,
  )
  return (
    <DiscoveryStage ambient="profile">
      <main className="sx-history sx-history-activities">
        <header className="sx-d-header">
          <div>
            <p className="sx-history-eyebrow">
              <Footprints size={18} aria-hidden="true" /> Tu recorrido
            </p>
            <h1>Mis actividades</h1>
            <p>Vuelve sobre tus pasos o encuentra una nueva parada en tu aventura.</p>
          </div>
          <span className="sx-history-emblem" aria-hidden="true">
            <Footprints size={32} />
          </span>
        </header>

        <div className="sx-history-toolbar">
          <div className="sx-history-filters" role="group" aria-label="Estado de las actividades">
            <button type="button" aria-pressed={!completed} onClick={() => setCompleted(false)}>
              <Compass size={18} aria-hidden="true" /> Disponibles
            </button>
            <button type="button" aria-pressed={completed} onClick={() => setCompleted(true)}>
              <CheckCheck size={18} aria-hidden="true" /> Realizadas
            </button>
          </div>
          <p className="sx-history-count" aria-live="polite">
            {points.length}{' '}
            {points.length === 1
              ? completed
                ? 'actividad realizada'
                : 'actividad disponible'
              : completed
                ? 'actividades realizadas'
                : 'actividades disponibles'}
          </p>
        </div>

        <h2 className="sx-history-section-title">
          {completed ? 'Actividades realizadas' : 'Actividades disponibles'}
        </h2>
        {points.length ? (
          <ul className="sx-activities-list">
            {points.map((point) => {
              const details = getPointDetails(point, adventure, journey)
              const Icon = point.icon
              return (
                <li
                  key={point.id}
                  className="sx-activity-summary"
                  data-zone={point.zone}
                  data-completed={completed}
                >
                  <span className="sx-history-activity-seal" aria-hidden="true">
                    <Icon size={26} />
                  </span>
                  <div>
                    <h3>{point.title}</h3>
                    <p>
                      {point.zone === 'camino' ? 'Camino' : 'Ciudad'} · {details.type}
                    </p>
                    <span className="sx-history-badge" data-status={details.badge}>
                      {completed && <CheckCheck size={14} aria-hidden="true" />}
                      {details.badge}
                    </span>
                  </div>
                  <Link className="sx-d-action sx-d-action-ghost" to={getPointMapHref(point)}>
                    <MapPin size={18} aria-hidden="true" /> Ver en el mapa
                    <span className="sr-only">: {point.title}</span>
                  </Link>
                </li>
              )
            })}
          </ul>
        ) : (
          <Parchment className="sx-history-empty">
            <span className="sx-history-activity-seal" aria-hidden="true">
              <Footprints size={28} />
            </span>
            <h3>{completed ? 'Tus huellas aparecerán aquí' : 'Una pausa en el recorrido'}</h3>
            <p>
              {completed
                ? 'Aún no has realizado actividades.'
                : 'No tienes actividades disponibles por ahora.'}
            </p>
            <Link className="sx-d-action" to="/student/missions">
              <MapPin size={18} aria-hidden="true" /> Explorar el Camino
            </Link>
          </Parchment>
        )}
      </main>
    </DiscoveryStage>
  )
}
