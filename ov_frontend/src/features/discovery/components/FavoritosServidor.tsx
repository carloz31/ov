import { Link } from 'react-router'
import { appPaths } from '@/routes/paths'
import { discoveryPaths } from '@/routes/discoveryPaths'
import { lineaInstitucion } from '@/lib/servidor/adaptadoresCatalogo'
import type { FavoritosCuenta } from '@/types/servidor'
import { createPlanFromCareer } from '../lib/plans'

// F06: los favoritos del catálogo en Mis planes (api), con el marcado de las columnas locales. Solo lectura;
// se marcan y desmarcan en el catálogo.
export function FavoritosServidor({
  favoritos,
  planes,
  disponible,
}: {
  favoritos: FavoritosCuenta | null
  planes: { sourceId?: string }[]
  disponible: boolean
}) {
  const carreras = favoritos?.carreras ?? [],
    ocupaciones = favoritos?.ocupaciones ?? [],
    instituciones = favoritos?.instituciones ?? []
  return (
    <div className="sx-d-columns">
      <section>
        <h3>Carreras · {carreras.length}</h3>
        {carreras.map((c) => {
          const position = planes.findIndex((p) => p.sourceId === c.codigo)
          return (
            <div className="sx-d-favorite-row" key={c.codigo}>
              <Link to={discoveryPaths.career(c.codigo)}>{c.nombre}</Link>
              {position >= 0 ? (
                <span>Plan {'ABC'[position]}</span>
              ) : (
                disponible && (
                  <button
                    type="button"
                    className="sx-d-action"
                    onClick={() => createPlanFromCareer(c.nombre, c.codigo)}
                  >
                    Hacer mi plan {'ABC'[planes.length]}
                  </button>
                )
              )}
            </div>
          )
        })}
        {!carreras.length && (
          <p>
            Aún no guardas carreras. <Link to={appPaths.student.catalog.careers}>Explorar carreras</Link>
          </p>
        )}
      </section>
      <section>
        <h3>Ocupaciones · {ocupaciones.length}</h3>
        {ocupaciones.map((o) => (
          <div key={o.codigo} className="sx-d-favorite-row">
            <Link to={discoveryPaths.occupation(o.codigo)}>{o.titulo}</Link>
          </div>
        ))}
        {!ocupaciones.length && (
          <p>
            Aún no guardas ocupaciones. <Link to={appPaths.student.catalog.professions}>Explorar ocupaciones</Link>
          </p>
        )}
      </section>
      <section>
        <h3>Instituciones · {instituciones.length}</h3>
        {instituciones.map((i) => (
          <div key={i.codigo} className="sx-d-favorite-row">
            <Link to={discoveryPaths.institution(i.codigo)}>{i.nombre}</Link>
            <small>{lineaInstitucion(i)}</small>
          </div>
        ))}
        {!instituciones.length && (
          <p>
            Aún no guardas instituciones.{' '}
            <Link to={appPaths.student.catalog.institutions}>Explorar instituciones</Link>
          </p>
        )}
      </section>
    </div>
  )
}
