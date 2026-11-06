import type { DimensionPagina, ResumenResultado } from '../types'

// Ajuste carga-instrumentos: los textos dependen de la página (inteligencias o habilidades sociales) y, en api, el
// puntaje visual va sin «%» y la tarjeta suma «Suele venir con…».
export function HighlightedDimensions({
  dimensiones,
  pagina,
  puntajeVisual = false,
}: {
  dimensiones: DimensionPagina[]
  pagina?: ResumenResultado['pagina']
  puntajeVisual?: boolean
}) {
  const habilidades = pagina === 'habilidades'
  const varias = dimensiones.length > 1
  return (
    <section className="sx-d-result-protagonist" aria-labelledby="inteligencias-destacadas">
      <h2 id="inteligencias-destacadas">
        {habilidades
          ? varias
            ? 'Tus habilidades sociales más desarrolladas hoy'
            : 'Tu habilidad social más desarrollada hoy'
          : varias
            ? 'Tus inteligencias más desarrolladas'
            : 'Tu inteligencia más desarrollada'}
      </h2>
      <div className="sx-d-result-highlights">
        {dimensiones.map((d) => (
          <article className="sx-d-result-card sx-d-result-highlight" key={d.code}>
            <span className="sx-d-result-circle">{`${d.score}${puntajeVisual ? '' : '%'}`}</span>
            <div>
              <h3>{d.name}</h3>
              <p>{d.description}</p>
              {d.ejemplos && (
                <p>
                  <strong>Suele notarse cuando</strong> {d.ejemplos}
                </p>
              )}
              {!!d.fortalezas?.length && (
                <>
                  <p>
                    <strong>Suele venir con</strong>
                  </p>
                  <ul className="sx-d-result-pieces">
                    {d.fortalezas.map((f) => (
                      <li key={f}>{f}</li>
                    ))}
                  </ul>
                </>
              )}
            </div>
          </article>
        ))}
      </div>
      {varias && (
        <p className="sx-d-result-note">
          {habilidades
            ? dimensiones.length === 2
              ? 'Dos habilidades quedaron'
              : 'Varias habilidades quedaron'
            : dimensiones.length === 2
              ? 'Dos inteligencias quedaron'
              : 'Varias inteligencias quedaron'}{' '}
          en el mismo nivel. No hace falta elegir entre ellas: juntas describen cómo te gusta aprender y resolver.
        </p>
      )}
    </section>
  )
}
