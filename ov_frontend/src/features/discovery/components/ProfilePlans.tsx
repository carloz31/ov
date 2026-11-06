import { Link } from 'react-router'
import { ArrowRight, CircleCheck, Heart, LockKeyhole } from 'lucide-react'
import { appPaths } from '@/routes/paths'
import { Parchment } from '@/components/student/Parchment'
import { PlanSectionCells } from './PlanSectionCells'

const VACIOS = [
  ['Tu primer camino', 'Empieza por un interés'],
  ['Un segundo camino', 'Se abre al guardar otro interés'],
  ['Un plan por si acaso', ''],
] as const

// Ajuste perfil-capitulos: capítulo III, los planes A/B/C con sus casillas de secciones, los favoritos en una
// grilla y el acceso a los planes.
export function ProfilePlans({
  plans,
  favoritos,
  bloqueo,
  onBloqueado,
}: {
  plans: { id: string; name: string; casillas: boolean[]; listas: number; total: number; completo: boolean }[]
  favoritos: { carreras: number; ocupaciones: number; instituciones: number }
  bloqueo?: string
  onBloqueado?: () => void
}) {
  const casillas = [
    [favoritos.carreras, favoritos.carreras === 1 ? 'carrera' : 'carreras'],
    [favoritos.ocupaciones, favoritos.ocupaciones === 1 ? 'ocupación' : 'ocupaciones'],
    [favoritos.instituciones, favoritos.instituciones === 1 ? 'institución' : 'instituciones'],
  ] as const
  return (
    <Parchment label="Capítulo III" title="Hacia dónde voy" className="sx-d-chapter">
      {[0, 1, 2].map((i) => {
        const plan = plans[i]
        return plan ? (
          <div className="sx-d-plan-row" data-complete={plan.completo} key={i}>
            <span className="sx-d-plan-letter" data-position={i}>
              {'ABC'[i]}
            </span>
            <div>
              <strong title={plan.name}>{plan.name}</strong>
              <div className="sx-d-plan-progress">
                <PlanSectionCells casillas={plan.casillas} />
                {plan.completo ? (
                  <span className="sx-d-plan-complete">
                    <CircleCheck aria-hidden="true" size={14} />
                    Plan completo
                  </span>
                ) : (
                  <small>
                    {plan.listas} de {plan.total} secciones
                  </small>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="sx-d-plan-row" data-empty="true" key={i}>
            <span className="sx-d-plan-letter" data-position={i}>
              {'ABC'[i]}
            </span>
            <div>
              <strong>{VACIOS[i][0]}</strong>
              {VACIOS[i][1] && <small>{VACIOS[i][1]}</small>}
            </div>
          </div>
        )
      })}
      <h3>Lo que guardaste en el camino</h3>
      <div className="sx-d-saved">
        {casillas.map(([n, nombre]) => (
          <Link key={nombre} data-empty={n === 0} to={`${appPaths.student.decisions}#sx-favorites`}>
            <span>
              <Heart aria-hidden="true" size={14} fill={n > 0 ? 'currentColor' : 'none'} />
              <strong>{n}</strong>
            </span>
            <small>{nombre}</small>
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
