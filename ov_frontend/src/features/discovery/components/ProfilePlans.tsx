import { Link } from 'react-router'
import { ArrowRight, Heart, LockKeyhole } from 'lucide-react'
import { appPaths } from '@/routes/paths'
import { Parchment } from '@/components/student/Parchment'

const VACIOS = [
  ['Tu primer camino', 'Empieza por un interés'],
  ['Un segundo camino', 'Se abre al guardar otro interés'],
  ['Un plan por si acaso', ''],
] as const

// Ajuste pasaporte-perfil: capítulo III, los planes A/B/C, los favoritos en chips y el acceso a los planes.
export function ProfilePlans({
  plans,
  espacioLibre,
  favoritos,
  bloqueo,
  onBloqueado,
}: {
  // F07a: en api, el resumen del plan (píldora) en lugar de la barra, y un solo texto para los espacios vacíos.
  plans: { id: string; name: string; armado: number; resumen?: string }[]
  espacioLibre?: string
  favoritos: { carreras: number; ocupaciones: number; instituciones: number }
  bloqueo?: string
  onBloqueado?: () => void
}) {
  const chips = [
    [favoritos.carreras, favoritos.carreras === 1 ? 'carrera' : 'carreras'],
    [favoritos.ocupaciones, favoritos.ocupaciones === 1 ? 'ocupación' : 'ocupaciones'],
    [favoritos.instituciones, favoritos.instituciones === 1 ? 'institución' : 'instituciones'],
  ] as const
  return (
    <Parchment label="Capítulo III" title="Hacia dónde voy" className="sx-d-chapter">
      {[0, 1, 2].map((i) => {
        const plan = plans[i]
        return plan ? (
          <div className="sx-d-plan-row" key={i}>
            <span className="sx-d-plan-letter" data-position={i}>
              {'ABC'[i]}
            </span>
            <div>
              <strong>{plan.name}</strong>
              {plan.resumen ? (
                <span className="sx-d-tag">{plan.resumen}</span>
              ) : (
                <div className="sx-d-mini-bar">
                  <span>
                    <span style={{ width: `${plan.armado}%` }} />
                  </span>
                  <small>{plan.armado} % armado</small>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="sx-d-plan-row" data-empty="true" key={i}>
            <span className="sx-d-plan-letter" data-position={i}>
              {'ABC'[i]}
            </span>
            <div>
              <strong>{espacioLibre ?? VACIOS[i][0]}</strong>
              {!espacioLibre && VACIOS[i][1] && <small>{VACIOS[i][1]}</small>}
            </div>
          </div>
        )
      })}
      <h3>Lo que guardaste en el camino</h3>
      <div className="sx-d-chips">
        {chips.map(([n, nombre]) => (
          <Link
            key={nombre}
            className="sx-d-chip"
            data-empty={n === 0}
            to={`${appPaths.student.decisions}#sx-favorites`}
          >
            <Heart aria-hidden="true" size={14} fill={n > 0 ? 'currentColor' : 'none'} />
            {n} {nombre}
          </Link>
        ))}
      </div>
      <Link
        className="sx-d-action"
        to={appPaths.student.decisions}
        title={bloqueo}
        onClick={
          onBloqueado
            ? (event) => {
                event.preventDefault()
                onBloqueado()
              }
            : undefined
        }
      >
        Ver mis planes
        {bloqueo ? (
          <>
            <small className="sr-only">{bloqueo}</small>
            <LockKeyhole className="sx-quick-lock" size={12} aria-hidden="true" />
          </>
        ) : (
          <ArrowRight aria-hidden="true" size={16} />
        )}
      </Link>
    </Parchment>
  )
}
