import type { AreaOcupaciones, OcupacionAfinPublica } from '@/types/servidor'
import {
  agruparPorArea,
  conteoBandas,
  filtrarBanda,
  type FiltroBanda,
  type VistaOcupaciones,
} from '../lib/resultadoIntereses'
import { TarjetaOcupacionAfin } from './TarjetaOcupacionAfin'

// Ajuste resultados-intereses: paso 1 del resultado del estudiante (boceto 01). Lista o por área, filtro por
// banda y, en la lista, las 6 primeras con «Mostrar N más»; por área, todas (sin recortar).
export const VISIBLES_ESTUDIANTE = 6

const FILTROS: { valor: FiltroBanda; texto: string }[] = [
  { valor: 'TODAS', texto: 'Todas' },
  { valor: 'MUY_AFIN', texto: 'Muy afín' },
  { valor: 'AFIN', texto: 'Afín' },
]

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
  filtro: FiltroBanda
  filtrar: (filtro: FiltroBanda) => void
  todas: boolean
  mostrarTodas: () => void
  href: (codigo: string) => string
}) {
  const conteos = conteoBandas(ocupaciones)
  const filtradas = filtrarBanda(ocupaciones, filtro)
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
      <div className="sx-r-controles">
        <div className="sx-r-segmentos" role="group" aria-label="Vista">
          {(['lista', 'area'] as const).map((v) => (
            <button key={v} type="button" aria-pressed={vista === v} onClick={() => elegirVista(v)}>
              {v === 'lista' ? 'Lista' : 'Por área'}
            </button>
          ))}
        </div>
        <div className="sx-r-segmentos" role="group" aria-label="Afinidad">
          {FILTROS.filter((f) => f.valor === 'TODAS' || conteos[f.valor]).map((f) => (
            <button
              key={f.valor}
              type="button"
              aria-pressed={filtro === f.valor}
              onClick={() => filtrar(f.valor)}
            >
              {f.texto} · {conteos[f.valor]}
            </button>
          ))}
        </div>
      </div>
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
        <small>
          El porcentaje es cuánto se parece el perfil de intereses de la ocupación al tuyo. Se muestran las
          que pasan de 50 %; «muy afín» desde 70 %. Fuente: O*NET Interest Profiler, adaptado a ocupaciones
          con formación en el Perú.
        </small>
      </footer>
    </section>
  )
}
