import { fragmentosResumen } from '../data/dimensionExamples'
import type { DimensionPagina } from '../types'

// Ajuste resultados-intereses (api): con `alPulsar`, cada letra abre la guía en su tarjeta.
export function InterestCode({
  dimensiones,
  empate,
  alPulsar,
}: {
  dimensiones: DimensionPagina[]
  empate: boolean
  alPulsar?: (codigo: string) => void
}) {
  const fragmentos = dimensiones.map((d) => fragmentosResumen[d.code])
  return (
    <section className="sx-d-result-protagonist" aria-labelledby="codigo-interes">
      <h2 id="codigo-interes">Tu código de interés</h2>
      <div className="sx-d-result-code">
        {dimensiones.map((d, i) => (
          <div key={d.code}>
            {alPulsar ? (
              <button
                type="button"
                className="sx-d-result-circle"
                data-dimension={d.code}
                aria-label={`${d.name}: abrir la guía`}
                onClick={() => alPulsar(d.code)}
              >
                {d.code}
              </button>
            ) : (
              <span className="sx-d-result-circle" data-dimension={d.code}>
                {d.code}
              </span>
            )}
            <h3>{d.name}</h3>
            <p>{['Más fuerte', 'Segundo', 'Tercero'][i]}</p>
          </div>
        ))}
      </div>
      {fragmentos.length === 3 && fragmentos.every(Boolean) ? (
        <p className="sx-d-result-summary">
          Te atraen sobre todo las actividades en las que <strong>{fragmentos[0]}</strong>, seguidas de
          aquellas en las que <strong>{fragmentos[1]}</strong> y de aquellas en las que{' '}
          <strong>{fragmentos[2]}</strong>.
        </p>
      ) : (
        <ul>
          {dimensiones.map((d) => (
            <li key={d.code}>{d.description}</li>
          ))}
        </ul>
      )}
      {empate && (
        <p className="sx-d-result-note">
          Algunos de tus intereses quedaron empatados; el orden entre ellos no indica preferencia.
        </p>
      )}
    </section>
  )
}
