import { useState } from 'react'
import { Link } from 'react-router'
import { ChevronRight, Heart, Search } from 'lucide-react'
import { Parchment } from '@/components/student/Parchment'
import { discoveryPaths } from '@/routes/discoveryPaths'
import { rangoSoles, soles } from '@/lib/servidor/adaptadoresCatalogo'
import type { CarreraEnInstitucion } from '@/types/servidor'

const VISIBLES = 6
// Con más carreras que esto, la tabla ofrece buscador y chips por área.
const CON_FILTROS = 8
const sinTildes = (texto: string) =>
  texto
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()

// Ajuste catalogo-datos-reales (F6b): las carreras de una institución como filas-enlace (favoritas primero),
// con el ingreso de los egresados de la institución en la familia de cada una.
export function CarrerasDeInstitucion({ carreras }: { carreras: CarreraEnInstitucion[] }) {
  const [texto, setTexto] = useState('')
  const [area, setArea] = useState('')
  const [todas, setTodas] = useState(false)
  const areas = [...new Map(carreras.map((c) => [c.familia.area_codigo, c.familia.area_nombre])).entries()]
  const filtradas = carreras
    .filter((c) => (!area || c.familia.area_codigo === area) && sinTildes(c.nombre).includes(sinTildes(texto.trim())))
    .sort((a, b) => Number(b.es_favorita) - Number(a.es_favorita))
  const visibles = todas ? filtradas : filtradas.slice(0, VISIBLES)
  return (
    <Parchment title="Carreras que ofrece">
      <p className="sx-c-subtitulo">
        Tus favoritas van primero y cada carrera lleva a su detalle. El ingreso es el <strong>promedio mensual</strong>{' '}
        de los egresados de esta institución en <strong>esa familia de carreras</strong>, no de la carrera exacta.
      </p>
      {carreras.length > CON_FILTROS && (
        <>
          <label className="sx-c-busqueda-chica">
            <Search aria-hidden="true" size={16} />
            <span className="sr-only">Buscar entre sus carreras</span>
            <input
              className="sx-d-input"
              placeholder={`Buscar entre sus ${carreras.length} carreras`}
              value={texto}
              onChange={(e) => setTexto(e.target.value)}
            />
          </label>
          {areas.length > 1 && (
            <div className="sx-c-chips-claros">
              <button type="button" aria-pressed={!area} onClick={() => setArea('')}>
                Todas las áreas
              </button>
              {areas.map(([codigo, nombre]) => (
                <button type="button" key={codigo} aria-pressed={area === codigo} onClick={() => setArea(codigo)}>
                  {nombre}
                </button>
              ))}
            </div>
          )}
        </>
      )}
      <div className="sx-c-tabla" role="table" aria-label="Carreras que ofrece">
        <div className="sx-c-tabla-cabeza" role="row">
          <span role="columnheader">Carrera</span>
          <span role="columnheader">Familia</span>
          <span role="columnheader">Promedio de egresados de la familia</span>
        </div>
        {visibles.map((c) => (
          <Link className="sx-c-tabla-fila" role="row" key={c.codigo} to={discoveryPaths.career(c.codigo)}>
            <span role="cell">
              <strong>{c.nombre}</strong>
              {c.es_favorita && (
                <span className="sx-c-favorita">
                  <Heart aria-hidden="true" size={12} fill="currentColor" /> Favorita
                </span>
              )}
              {c.duracion && <small>{c.duracion}</small>}
            </span>
            <span role="cell">{c.familia.nombre}</span>
            <span role="cell" className="sx-c-monto">
              {c.ingreso ? (
                <>
                  <strong>{soles(c.ingreso.promedio)}</strong>
                  <small>{rangoSoles(c.ingreso)}</small>
                </>
              ) : (
                <small>Sin dato</small>
              )}
            </span>
            <ChevronRight aria-hidden="true" size={18} />
          </Link>
        ))}
        {!filtradas.length && <p>Ninguna carrera coincide con tu búsqueda.</p>}
      </div>
      {!todas && filtradas.length > VISIBLES && (
        <button type="button" className="sx-d-action sx-d-action-ghost sx-d-full" onClick={() => setTodas(true)}>
          Mostrar las {filtradas.length - VISIBLES} restantes
        </button>
      )}
    </Parchment>
  )
}
