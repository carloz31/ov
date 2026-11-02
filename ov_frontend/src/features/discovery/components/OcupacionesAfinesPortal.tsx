import { Link } from 'react-router'
import type { AreaOcupaciones, OcupacionAfinPublica } from '@/types/servidor'
import { agruparPorArea, etiquetaAfinidad, type VistaOcupaciones } from '../lib/resultadoIntereses'

// Ajuste resultados-intereses: las ocupaciones afines del hijo como tabla, en el portal (boceto 02). Las 8
// primeras y «Mostrar las N restantes»; por área, todas.
export const VISIBLES_PORTAL = 8

function Filas({
  ocupaciones,
  href,
}: {
  ocupaciones: OcupacionAfinPublica[]
  href: (codigo: string) => string
}) {
  return (
    <table className="sx-p-tabla">
      <thead>
        <tr>
          <th scope="col">#</th>
          <th scope="col">Ocupación</th>
          <th scope="col">Afinidad</th>
          <th scope="col">Familia de carreras</th>
          <th scope="col">
            <span className="sr-only">Ficha</span>
          </th>
        </tr>
      </thead>
      <tbody>
        {ocupaciones.map((o) => (
          <tr key={o.codigo}>
            <td>{o.posicion}</td>
            <th scope="row">{o.titulo}</th>
            <td>
              <span className="sx-p-banda" data-banda={o.banda}>
                {etiquetaAfinidad(o)}
              </span>
            </td>
            <td>{o.familia_principal?.nombre ?? 'Sin familia'}</td>
            <td>
              <Link to={href(o.codigo)}>Ver ficha</Link>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

export function OcupacionesAfinesPortal({
  ocupaciones,
  porArea,
  pocoMarcado,
  vista,
  elegirVista,
  todas,
  mostrarTodas,
  href,
}: {
  ocupaciones: OcupacionAfinPublica[]
  porArea: AreaOcupaciones[]
  pocoMarcado: boolean
  vista: VistaOcupaciones
  elegirVista: (vista: VistaOcupaciones) => void
  todas: boolean
  mostrarTodas: () => void
  href: (codigo: string) => string
}) {
  const recortada = vista === 'lista' && !todas && ocupaciones.length > VISIBLES_PORTAL
  return (
    <section className="sx-p-panel" aria-labelledby="titulo-afines-portal">
      <div className="sx-p-cabecera">
        <div>
          <h2 id="titulo-afines-portal">Ocupaciones afines a su perfil</h2>
          <p>
            {pocoMarcado
              ? `Su perfil es poco marcado: estas son las ${ocupaciones.length} ocupaciones más cercanas aunque no pasen de 50 %.`
              : `${ocupaciones.length} ocupaciones cuyo perfil se parece al suyo en más de 50 %, de la más parecida a la menos.`}
            {recortada && ` Se muestran las ${VISIBLES_PORTAL} primeras.`}
          </p>
        </div>
        <div className="sx-p-segmentos" role="group" aria-label="Vista">
          {(['lista', 'area'] as const).map((v) => (
            <button key={v} type="button" aria-pressed={vista === v} onClick={() => elegirVista(v)}>
              {v === 'lista' ? 'Lista' : 'Por área'}
            </button>
          ))}
        </div>
      </div>
      {vista === 'lista' ? (
        <Filas ocupaciones={recortada ? ocupaciones.slice(0, VISIBLES_PORTAL) : ocupaciones} href={href} />
      ) : (
        agruparPorArea(ocupaciones, porArea).map((area) => (
          <section key={area.codigo ?? 'sin-familia'} aria-label={area.nombre} className="sx-p-area">
            <h3>
              {area.nombre} <small>· {area.ocupaciones.length}</small>
            </h3>
            <Filas ocupaciones={area.ocupaciones} href={href} />
          </section>
        ))
      )}
      <footer className="sx-p-pie">
        {recortada ? (
          <button type="button" className="sx-p-boton-borde" onClick={mostrarTodas}>
            Mostrar las {ocupaciones.length - VISIBLES_PORTAL} restantes
          </button>
        ) : (
          <span />
        )}
        <small>Fuente: O*NET Interest Profiler, adaptado a ocupaciones con formación en el Perú.</small>
      </footer>
    </section>
  )
}
