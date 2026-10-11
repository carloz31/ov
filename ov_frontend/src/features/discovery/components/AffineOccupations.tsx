import { Parchment } from '@/components/student/Parchment'
import { appPaths } from '@/routes/paths'
import { ChevronRight } from 'lucide-react'
import { Link } from 'react-router'
import { FavoriteButton } from '@/components/student/FavoriteButton'
import type { OcupacionResultado } from '../types'
import type { KeyboardEvent } from 'react'

const ajustes = ['Todas', 'Mejor ajuste', 'Gran ajuste', 'Buen ajuste']

function moverFiltro(event: KeyboardEvent<HTMLDivElement>, ajuste: string, filtrar: (valor: string) => void) {
  if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return
  event.preventDefault()
  const actual = ajustes.indexOf(ajuste)
  const siguiente =
    event.key === 'Home'
      ? 0
      : event.key === 'End'
        ? ajustes.length - 1
        : (actual + (event.key === 'ArrowRight' ? 1 : -1) + ajustes.length) % ajustes.length
  filtrar(ajustes[siguiente])
  event.currentTarget.querySelectorAll<HTMLButtonElement>('[role="tab"]')[siguiente]?.focus()
}

export function AffineOccupations({
  ocupaciones,
  ajuste,
  filtrar,
  seleccion,
  elegir,
  guardar,
}: {
  ocupaciones: OcupacionResultado[]
  ajuste: string
  filtrar: (ajuste: string) => void
  seleccion?: string
  elegir: (clave: string) => void
  guardar: (codigo: string) => void
}) {
  return (
    <Parchment className="sx-d-result-panel sx-d-result-occupations" aria-labelledby="ocupaciones-afines">
      <div className="sx-d-result-section-head">
        <div className="sx-d-result-section-intro">
          <p className="sx-d-eyebrow">Paso 1 · Ocupaciones afines</p>
          <h2 id="ocupaciones-afines">Trabajos que se parecen a lo que te atrae</h2>
          <p>
            Las ocupaciones cuyo perfil de intereses se parece más al tuyo. Elige una para ver abajo qué
            carreras conducen a ella.
          </p>
        </div>
        <div
          className="sx-d-result-tabs"
          role="tablist"
          aria-label="Ajuste de las ocupaciones"
          onKeyDown={(event) => moverFiltro(event, ajuste, filtrar)}
        >
          {ajustes.map((f) => (
            <button
              key={f}
              type="button"
              role="tab"
              aria-selected={ajuste === f}
              tabIndex={ajuste === f ? 0 : -1}
              onClick={() => filtrar(f)}
            >
              {f}
            </button>
          ))}
        </div>
      </div>
      <div className="sx-d-result-grid">
        {ocupaciones.map((o) => (
          <article key={o.clave} className="sx-d-result-card">
            <div className="sx-d-result-section-head">
              <span className="sx-d-result-fit" data-ajuste={o.ajuste}>
                {o.ajuste}
              </span>
              {o.codigo && (
                <FavoriteButton selected={o.favorita} compact onToggle={() => guardar(o.codigo!)} />
              )}
            </div>
            <h3>{o.titulo}</h3>
            {o.descripcion && <p>{o.descripcion}</p>}
            {!!o.letras?.length && (
              <div className="sx-d-result-shared">
                <div className="sx-d-result-chips">
                  {o.letras.map((l) => (
                    <span key={l} data-dimension={l}>
                      {l}
                    </span>
                  ))}
                </div>
                <p>
                  {o.compartidas === 3
                    ? 'Comparte tus tres intereses'
                    : `Comparte ${o.compartidas} de tus intereses`}
                </p>
              </div>
            )}
            <div className="sx-d-result-actions">
              <button
                type="button"
                className="sx-d-action"
                aria-pressed={seleccion === o.clave}
                onClick={() => elegir(o.clave)}
              >
                {seleccion === o.clave ? 'Mostrando sus carreras' : 'Ver sus carreras'}
              </button>
              {o.href && (
                <Link
                  className="sx-d-action sx-d-action-ghost"
                  to={o.href}
                  aria-label={`Ver detalle de ${o.titulo}`}
                >
                  <ChevronRight aria-hidden="true" />
                </Link>
              )}
            </div>
          </article>
        ))}
      </div>
      <p className="sx-d-result-note">
        Se muestran hasta 10 ocupaciones, de las que más se parecen a tu perfil a las que menos. Fuente: O*NET
        Interest Profiler.
      </p>
      <Link className="sx-d-result-catalog-link" to={`${appPaths.student.catalog.professions}?afines=1`}>
        Ocupaciones afines en el catálogo
        <ChevronRight aria-hidden="true" />
      </Link>
    </Parchment>
  )
}
