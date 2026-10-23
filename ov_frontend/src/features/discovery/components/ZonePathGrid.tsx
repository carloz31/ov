import { Flag, Info } from 'lucide-react'
import { zonaEnPalabras } from '@/lib/servidor/adaptadoresInstrumentos'
import { ZONAS, type ModeloPartidaLlegada } from '../lib/partidaLlegada'
import { ZonePath } from './ZonePath'

// Ajuste de F03: «El camino de cada parte», la columna derecha del panel oscuro: un mini camino por dimensión
// bajo las tres zonas, con su leyenda.
export function ZonePathGrid({
  modelo,
  guia,
  abrirGuia,
}: {
  modelo: ModeloPartidaLlegada
  guia: boolean
  abrirGuia: () => void
}) {
  return (
    <section className="sx-d-pl-paths" aria-labelledby="camino-partes">
      <div className="sx-d-result-section-head">
        <h2 id="camino-partes">El camino de cada parte</h2>
        <button
          className="sx-d-action sx-d-action-ghost sx-d-pl-guide"
          type="button"
          aria-expanded={guia}
          aria-controls="guia-zonas"
          onClick={abrirGuia}
        >
          <Info aria-hidden="true" />
          ¿Qué significa cada zona?
        </button>
      </div>
      <div className="sx-d-pl-scroll">
        <div className="sx-d-pl-path-grid">
          <span aria-hidden="true" />
          {ZONAS.map((zona) => (
            <span key={zona} className="sx-d-pl-path-zone">
              {zonaEnPalabras(zona)}
            </span>
          ))}
          {modelo.dimensiones.map((d) => (
            <div key={d.codigo} className="sx-d-pl-path-row">
              <span>{d.nombre}</span>
              <ZonePath partida={d.zonaPartida} llegada={d.zonaLlegada} />
            </div>
          ))}
        </div>
      </div>
      <ul className="sx-d-pl-legend">
        <li>
          <Flag className="sx-d-pl-flag" aria-hidden="true" />
          {modelo.completo ? 'Donde empezaste' : 'Donde empiezas'}
        </li>
        {modelo.completo ? (
          <>
            <li>
              <Flag className="sx-d-pl-flag sx-d-pl-flag-full" fill="currentColor" aria-hidden="true" />
              Donde estás hoy
            </li>
            <li>Si los dos banderines están juntos, te mantuviste en la misma zona.</li>
          </>
        ) : (
          <li>El banderín de llegada aparecerá al final del camino.</li>
        )}
      </ul>
    </section>
  )
}
