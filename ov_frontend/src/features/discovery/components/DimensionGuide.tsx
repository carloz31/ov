import { Parchment } from '@/components/student/Parchment'
import { X } from 'lucide-react'
import type { DimensionPagina, ResumenResultado } from '../types'

// Ajuste carga-instrumentos (api): «Suele notarse cuando…», «Suele venir con…» y «Para desarrollarla»; lo vacío
// no se pinta, ni su rótulo.
function PiezasDimension({ dimension }: { dimension: DimensionPagina }) {
  const lista = (rotulo: string, elementos?: string[]) =>
    !!elementos?.length && (
      <>
        <p>
          <strong>{rotulo}</strong>
        </p>
        <ul className="sx-d-result-pieces">
          {elementos.map((e) => (
            <li key={e}>{e}</li>
          ))}
        </ul>
      </>
    )
  return (
    <>
      {dimension.ejemplos && (
        <p>
          <strong>Suele notarse cuando</strong> {dimension.ejemplos}
        </p>
      )}
      {lista('Suele venir con', dimension.fortalezas)}
      {lista('Para desarrollarla', dimension.desarrollo)}
    </>
  )
}

export function DimensionGuide({ resumen, cerrar }: { resumen: ResumenResultado; cerrar: () => void }) {
  const intereses = resumen.tipoResultado === 'COINCIDENCIAS'
  const habilidades = resumen.pagina === 'habilidades'
  return (
    <Parchment
      id="guia-dimensiones"
      className="sx-d-result-panel sx-d-result-guide"
      aria-labelledby="titulo-guia"
    >
      <div className="sx-d-result-section-head">
        <div>
          <p className="sx-d-eyebrow">Guía rápida</p>
          <h2 id="titulo-guia">
            {intereses
              ? 'Los seis tipos de interés (RIASEC)'
              : habilidades
                ? 'Las cinco habilidades sociales de este inventario'
                : 'Las siete inteligencias de este cuestionario'}
          </h2>
        </div>
        <button
          type="button"
          className="sx-d-action sx-d-action-ghost"
          aria-label="Cerrar guía"
          onClick={cerrar}
        >
          <X aria-hidden="true" />
        </button>
      </div>
      {intereses && (
        <p>
          Tu código son las tres letras con más fuerza. Cada ocupación también tiene su código, y por eso
          podemos compararlas contigo.
        </p>
      )}
      <div className="sx-d-result-grid">
        {resumen.dimensiones.map((d) => (
          <article
            key={d.code}
            className={`sx-d-result-card${resumen.protagonistas.some((p) => p.code === d.code) ? ' sx-d-result-highlight' : ''}`}
          >
            <span className="sx-d-result-guide-id" data-dimension={d.code} aria-hidden="true">
              {intereses ? d.code : d.name.slice(0, 1)}
            </span>
            <div>
              <h3>{d.name}</h3>
              <p>{d.description}</p>
              {resumen.puntajeVisual ? (
                <PiezasDimension dimension={d} />
              ) : (
                d.ejemplos && <p>Por ejemplo: {d.ejemplos}</p>
              )}
            </div>
          </article>
        ))}
      </div>
    </Parchment>
  )
}
