import { Link } from 'react-router'
import type { AreaOcupaciones, OcupacionAfinPublica } from '@/types/servidor'
import {
  agruparPorArea,
  conteoPreparacion,
  etiquetaAfinidad,
  filtrarPreparacion,
  pieAfinidad,
  type FiltroPreparacion,
  type VistaOcupaciones,
} from '../lib/resultadoIntereses'
import { ControlesAfines } from './ControlesAfines'

// Ajuste resultados-intereses: las ocupaciones afines del hijo como tabla, en el portal (boceto 02). Las 8
// primeras y «Mostrar las N restantes»; por área, todas. El filtro de preparación es el mismo del estudiante.
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
  filtro,
  filtrar,
  todas,
  mostrarTodas,
  href,
}: {
  ocupaciones: OcupacionAfinPublica[]
  porArea: AreaOcupaciones[]
  pocoMarcado: boolean
  vista: VistaOcupaciones
  elegirVista: (vista: VistaOcupaciones) => void
  filtro: FiltroPreparacion
  filtrar: (filtro: FiltroPreparacion) => void
  todas: boolean
  mostrarTodas: () => void
  href: (codigo: string) => string
}) {
  const filtradas = filtrarPreparacion(ocupaciones, filtro)
  const recortada = vista === 'lista' && !todas && filtradas.length > VISIBLES_PORTAL
  return (
    <section className="sx-p-panel" aria-labelledby="titulo-afines-portal">
      <div className="sx-p-cabecera">
        <div>
          <h2 id="titulo-afines-portal">Ocupaciones afines a su perfil</h2>
          <p>
            {pocoMarcado
              ? `Su perfil es poco marcado: estas son las ${ocupaciones.length} ocupaciones más cercanas aunque no pasen de 50 %.`
              : `${ocupaciones.length} ocupaciones cuyo perfil se parece al suyo en más de 50 %, de la más parecida a la menos.`}
          </p>
        </div>
      </div>
      <ControlesAfines
        prefijo="sx-p"
        vista={vista}
        elegirVista={elegirVista}
        filtro={filtro}
        filtrar={filtrar}
        conteos={conteoPreparacion(ocupaciones)}
      />
      {vista === 'lista' ? (
        <Filas ocupaciones={recortada ? filtradas.slice(0, VISIBLES_PORTAL) : filtradas} href={href} />
      ) : (
        agruparPorArea(filtradas, porArea).map((area) => (
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
            Mostrar las {filtradas.length - VISIBLES_PORTAL} restantes
          </button>
        ) : (
          <span />
        )}
        <small>{pieAfinidad('suyo')}</small>
      </footer>
    </section>
  )
}
