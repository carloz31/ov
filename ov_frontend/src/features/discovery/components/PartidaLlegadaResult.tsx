import { zonaEnPalabras } from '@/lib/servidor/adaptadoresInstrumentos'
import type { DimensionPartidaLlegada } from '../lib/partidaLlegada'

// F03 (HU-094): partida y llegada por dimensión, sin puntajes. Los ítems que cambiaron van primero, con el
// mismo estilo sea cual sea el sentido del cambio; los que se mantuvieron quedan plegados.
export function PartidaLlegadaResult({ dimensiones }: { dimensiones: DimensionPartidaLlegada[] }) {
  return (
    <section className="sx-d-result-comparison" aria-label="Partida y llegada por dimensión">
      {dimensiones.map((d) => (
        <article key={d.codigo} className="sx-d-helena-dimension">
          <div>
            <h2>{d.nombre}</h2>
            <strong className="sx-d-helena-zone">{zonaEnPalabras(d.zonaPartida)}</strong>
            <p>{d.descripcion}</p>
            {d.cambiaron.length > 0 && (
              <ul>
                {d.cambiaron.map((item) => (
                  <li key={item.item}>
                    <span>{item.enunciado}</span>{' '}
                    <strong>
                      {item.partida} → {item.llegada}
                    </strong>
                  </li>
                ))}
              </ul>
            )}
            {d.mantenidos.length > 0 && (
              <details>
                <summary>
                  {d.mantenidos.length}{' '}
                  {d.mantenidos.length === 1 ? 'respuesta se mantuvo' : 'respuestas se mantuvieron'}
                </summary>
                <ul>
                  {d.mantenidos.map((item) => (
                    <li key={item.item}>
                      <span>{item.enunciado}</span> <strong>{item.partida}</strong>
                    </li>
                  ))}
                </ul>
              </details>
            )}
          </div>
        </article>
      ))}
    </section>
  )
}
