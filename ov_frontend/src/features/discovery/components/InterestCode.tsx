import { fragmentosResumen } from '../data/dimensionExamples'
import type { DimensionPagina } from '../types'

export function InterestCode({ dimensiones, empate }: { dimensiones: DimensionPagina[]; empate: boolean }) {
  const fragmentos = dimensiones.map((d) => fragmentosResumen[d.code])
  return (
    <section className="sx-d-result-protagonist" aria-labelledby="codigo-interes">
      <h2 id="codigo-interes">Tu código de interés</h2>
      <div className="sx-d-result-code">
        {dimensiones.map((d, i) => (
          <div key={d.code}>
            <span className="sx-d-result-circle" data-dimension={d.code}>
              {d.code}
            </span>
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
