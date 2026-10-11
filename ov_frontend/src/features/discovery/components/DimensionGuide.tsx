import { Parchment } from '@/components/student/Parchment'
import { X } from 'lucide-react'
import type { ResumenResultado } from '../types'

export function DimensionGuide({ resumen, cerrar }: { resumen: ResumenResultado; cerrar: () => void }) {
  const intereses = resumen.tipoResultado === 'COINCIDENCIAS'
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
              {d.ejemplos && <p>Por ejemplo: {d.ejemplos}</p>}
            </div>
          </article>
        ))}
      </div>
    </Parchment>
  )
}
