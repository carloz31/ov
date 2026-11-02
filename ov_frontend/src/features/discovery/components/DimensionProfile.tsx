import { Info } from 'lucide-react'
import type { ResumenResultado } from '../types'

export function DimensionProfile({
  resumen,
  guia,
  abrirGuia,
  expandidas,
  alternar,
  alPulsar,
}: {
  resumen: ResumenResultado
  guia: boolean
  abrirGuia: () => void
  expandidas: string[]
  alternar: (codigo: string) => void
  // Ajuste resultados-intereses (api): sin el botón de la guía; cada barra la abre en su tarjeta.
  alPulsar?: (codigo: string) => void
}) {
  const intereses = resumen.tipoResultado === 'COINCIDENCIAS'
  const habilidades = resumen.pagina === 'habilidades'
  return (
    <section className="sx-d-result-profile" aria-labelledby="perfil-dimensiones">
      <div className="sx-d-result-section-head">
        <h2 id="perfil-dimensiones">
          {intereses
            ? 'Cuánto resonó cada tipo de actividad'
            : habilidades
              ? 'Cuánto se expresó cada habilidad'
              : 'Cuánto se expresó cada inteligencia'}
        </h2>
        {!alPulsar && (
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
        )}
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
                aria-expanded={alPulsar ? undefined : abierta}
                aria-controls={alPulsar ? 'guia-dimensiones' : `dimension-${d.code}`}
                onClick={() => (alPulsar ? alPulsar(d.code) : alternar(d.code))}
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
                <span>{`${d.score}${resumen.puntajeVisual ? '' : '%'}`}</span>
              </button>
              {abierta && <p id={`dimension-${d.code}`}>{d.description}</p>}
            </div>
          )
        })}
      </div>
      {!alPulsar && (
        <p className="sx-d-result-note">
          {intereses
            ? 'Toca un tipo para ver qué significa, o abre la guía completa. Ninguno es mejor que otro.'
            : habilidades
              ? 'Las que quedaron abajo no son una carencia: en la guía encontrarás por dónde empezar.'
              : resumen.puntajeVisual
                ? 'Toca una inteligencia para ver qué significa. Un puntaje bajo no es una carencia: es una capacidad que aún puedes ejercitar.'
                : 'Toca una inteligencia para ver qué significa. Un porcentaje bajo no es una carencia: es una capacidad que aún puedes ejercitar.'}
        </p>
      )}
    </section>
  )
}
