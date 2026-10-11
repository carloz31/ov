import { Parchment } from '@/components/student/Parchment'
import { Heart } from 'lucide-react'
import { Link } from 'react-router'
import { discoveryPaths } from '@/routes/discoveryPaths'
import type { CarreraResultado } from '../types'

export function RecommendedCareers({
  carreras,
  ocupacion,
  verTodas,
  siguientePlan,
  guardar,
  crearPlan,
}: {
  carreras: CarreraResultado[]
  ocupacion?: string
  verTodas: () => void
  siguientePlan?: string
  guardar: (codigo: string) => void
  crearPlan: (nombre: string, codigo: string) => void
}) {
  return (
    <Parchment className="sx-d-result-panel sx-d-result-careers" aria-labelledby="carreras-afines">
      <p className="sx-d-eyebrow">Paso 2 · Carreras que conducen a ellas</p>
      <div className="sx-d-result-section-head">
        <h2 id="carreras-afines">
          {ocupacion
            ? `Carreras para ser ${ocupacion.toLocaleLowerCase('es')}`
            : 'Carreras que conducen a tus ocupaciones afines'}
        </h2>
        {ocupacion && (
          <button className="sx-d-action sx-d-action-ghost" type="button" onClick={verTodas}>
            Ver todas las carreras
          </button>
        )}
      </div>
      <p>
        {ocupacion
          ? 'Estas carreras forman para la ocupación que elegiste arriba.'
          : 'Ordenadas por cuántas de tus ocupaciones afines alcanzan. Guarda las que te interesen o conviértelas en un plan.'}
      </p>
      <div className="sx-d-result-grid">
        {carreras.map((c) => (
          <article key={c.codigo} className={`sx-d-result-card${c.plan ? ' sx-d-result-planned' : ''}`}>
            <div className="sx-d-result-career-info">
              <div className="sx-d-result-career-title">
                <h3>{c.nombre}</h3>
                {c.plan && (
                  <span className="sx-d-result-plan" data-plan={c.plan}>
                    Ya es tu plan {c.plan}
                  </span>
                )}
              </div>
              <p>
                {c.familia}
                {c.duracion && ` · ${c.duracion}`}
              </p>
              <div className="sx-d-result-via">
                <strong>
                  {c.via.length > 1 ? `Conduce a ${c.via.length} de tus ocupaciones afines:` : 'Conduce a:'}
                </strong>
                <div className="sx-d-result-chips">
                  {c.via.map((o) => (
                    <span key={o.codigo_onet}>{o.titulo}</span>
                  ))}
                </div>
              </div>
            </div>
            <div className="sx-d-result-actions">
              <button
                type="button"
                className="sx-d-action"
                aria-pressed={c.favorita}
                onClick={() => guardar(c.codigo)}
              >
                <Heart aria-hidden="true" fill={c.favorita ? 'currentColor' : 'none'} />
                {c.favorita ? 'Favorita' : 'Guardar'}
              </button>
              {!c.plan && siguientePlan && (
                <button
                  type="button"
                  className="sx-d-action sx-d-action-gold"
                  onClick={() => crearPlan(c.nombre, c.codigo)}
                >
                  Hacer mi plan {siguientePlan}
                </button>
              )}
              <Link className="sx-d-action sx-d-action-ghost" to={discoveryPaths.career(c.codigo)}>
                Ver carrera
              </Link>
            </div>
          </article>
        ))}
      </div>
      <p className="sx-d-result-note">
        Carreras del Perú que forman para tus ocupaciones afines. Puedes tener hasta 3 planes: A, B y C.
      </p>
    </Parchment>
  )
}
