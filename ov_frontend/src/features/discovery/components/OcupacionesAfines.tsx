import type { AreaOcupaciones, OcupacionAfinPublica } from '@/types/servidor'
import {
  agruparPorArea,
  conteoPreparacion,
  filtrarPreparacion,
  pieAfinidad,
  type FiltroPreparacion,
  type VistaOcupaciones,
} from '../lib/resultadoIntereses'
import { ControlesAfines } from './ControlesAfines'
import { TarjetaOcupacionAfin } from './TarjetaOcupacionAfin'

// Ajuste resultados-intereses: paso 1 del resultado del estudiante (boceto 01). Lista o por área, filtro por la
// preparación que suele pedir el trabajo y, en la lista, las 6 primeras con «Mostrar N más»; por área, todas.
export const VISIBLES_ESTUDIANTE = 6

export function OcupacionesAfines({
  ocupaciones,
  porArea,
  codigo,
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
  codigo: string
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
  const recortada = vista === 'lista' && !todas && filtradas.length > VISIBLES_ESTUDIANTE
  const visibles = recortada ? filtradas.slice(0, VISIBLES_ESTUDIANTE) : filtradas
  const tarjeta = (o: OcupacionAfinPublica) => (
    <TarjetaOcupacionAfin
      key={o.codigo}
      ocupacion={o}
      total={ocupaciones.length}
      codigo={codigo}
      href={href(o.codigo)}
    />
  )
  return (
    <section id="ocupaciones-afines" className="sx-r-panel sx-r-claro" aria-labelledby="titulo-afines">
      <p className="sx-r-rotulo">Paso 1 · Ocupaciones afines</p>
      <h2 id="titulo-afines">Trabajos que se parecen a lo que te atrae</h2>
      <p className="sx-r-intro">
        {pocoMarcado ? (
          <>
            Estas son las <strong>{ocupaciones.length} ocupaciones</strong> más parecidas a tu perfil de
            intereses, ordenadas de la más parecida a la menos. Toca una para ver qué hace y cómo se llega a
            ella.
          </>
        ) : (
          <>
            Encontramos <strong>{ocupaciones.length} ocupaciones</strong> cuyo perfil de intereses se parece
            al tuyo en más de 50 %. Están ordenadas de la más parecida a la menos. Toca una para ver qué hace
            y cómo se llega a ella.
          </>
        )}
      </p>
      {pocoMarcado && (
        <p className="sx-r-aviso" role="note">
          Tu perfil es poco marcado: estas son las 10 ocupaciones más cercanas aunque no pasen de 50 %.
        </p>
      )}
      <ControlesAfines
        prefijo="sx-r"
        vista={vista}
        elegirVista={elegirVista}
        filtro={filtro}
        filtrar={filtrar}
        conteos={conteoPreparacion(ocupaciones)}
      />
      {vista === 'lista' ? (
        <div className="sx-r-grilla">{visibles.map(tarjeta)}</div>
      ) : (
        agruparPorArea(visibles, porArea).map((area) => (
          <section key={area.codigo ?? 'sin-familia'} className="sx-r-area" aria-label={area.nombre}>
            <h3>
              {area.nombre} <small>· {area.ocupaciones.length}</small>
            </h3>
            <div className="sx-r-grilla">{area.ocupaciones.map(tarjeta)}</div>
          </section>
        ))
      )}
      <footer className="sx-r-pie">
        {recortada ? (
          <button type="button" className="sx-r-boton-borde" onClick={mostrarTodas}>
            Mostrar {filtradas.length - VISIBLES_ESTUDIANTE} más
          </button>
        ) : (
          <span />
        )}
        <small>{pieAfinidad('tuyo')}</small>
      </footer>
    </section>
  )
}
