import { Info } from 'lucide-react'
import type { ResumenResultado } from '../types'

export function DimensionProfile({
  resumen,
  guia,
  abrirGuia,
  expandidas,
  alternar,
}: {
  resumen: ResumenResultado
  guia: boolean
  abrirGuia: () => void
  expandidas: string[]
  alternar: (codigo: string) => void
}) {
  const intereses = resumen.tipoResultado === 'COINCIDENCIAS'
  return (
    <section className="sx-d-result-profile" aria-labelledby="perfil-dimensiones">
      <div className="sx-d-result-section-head">
        <h2 id="perfil-dimensiones">
          {intereses ? 'Cuánto resonó cada tipo de actividad' : 'Cuánto se expresó cada inteligencia'}
        </h2>
        <button
          className="sx-d-action sx-d-action-ghost"
          type="button"
          aria-expanded={guia}
          aria-controls="guia-dimensiones"
          onClick={abrirGuia}
        >
          <Info aria-hidden="true" />
          {intereses ? '¿Qué significa cada tipo?' : '¿Qué es cada una?'}
        </button>
      </div>
      <div className="sx-d-result-bars">
        {resumen.ordenadas.map((d) => {
          const destacado = resumen.protagonistas.some((p) => p.code === d.code)
          const abierta = expandidas.includes(d.code)
          return (
            <div
              key={d.code}
              className={destacado ? 'sx-d-result-dimension sx-d-result-highlight' : 'sx-d-result-dimension'}
            >
              <button
                type="button"
                aria-expanded={abierta}
                aria-controls={`dimension-${d.code}`}
                onClick={() => alternar(d.code)}
              >
                <span className="sx-d-result-dimension-name">
                  <span
                    className={intereses ? 'sx-d-result-letter' : 'sx-d-result-dot'}
                    data-dimension={d.code}
                    aria-hidden="true"
                  >
                    {intereses ? d.code : null}
                  </span>
                  {d.name}
                </span>
                <span className="sx-d-result-track" aria-hidden="true">
                  <span style={{ width: `${d.score}%` }} />
                </span>
                <span>{d.score}%</span>
              </button>
              {abierta && <p id={`dimension-${d.code}`}>{d.description}</p>}
            </div>
          )
        })}
      </div>
      <p className="sx-d-result-note">
        {intereses
          ? 'Toca un tipo para ver qué significa, o abre la guía completa. Ninguno es mejor que otro.'
          : 'Toca una inteligencia para ver qué significa. Un porcentaje bajo no es una carencia: es una capacidad que aún puedes ejercitar.'}
      </p>
    </section>
  )
}
