import { Parchment } from '@/components/student/Parchment'
import { bajo, type DimensionPartidaLlegada, type ModeloPartidaLlegada } from '../lib/partidaLlegada'
import { ItemComparisonGrid } from './ItemComparisonGrid'
import { ZoneChips } from './ZoneChips'

type EstadoItems = { cargando: boolean; error: string; reintentar: () => void }

// Ajuste de F03: «Paso 1 · Tus respuestas», una tarjeta por dimensión con su rejilla de ítems.
export function PartidaLlegadaAnswers({ modelo, items }: { modelo: ModeloPartidaLlegada; items: EstadoItems }) {
  return (
    <Parchment className="sx-d-result-panel sx-d-pl-answers" aria-labelledby="tus-respuestas">
      <div className="sx-d-result-section-intro">
        <p className="sx-d-eyebrow">Paso 1 · Tus respuestas</p>
        <h2 id="tus-respuestas">
          {modelo.completo ? 'Qué cambió, respuesta por respuesta' : 'Lo que respondiste al empezar'}
        </h2>
        <p>
          {modelo.completo
            ? 'En cada parte verás primero las respuestas que cambiaron. Las que se mantuvieron quedan plegadas al final.'
            : 'Tus respuestas, parte por parte. Al final del camino podrás compararlas con las de tu llegada.'}
        </p>
      </div>
      {items.error && (
        <div className="sx-d-warning" role="alert">
          <p>{items.error}</p>
          <button type="button" className="sx-d-action" onClick={items.reintentar}>
            Reintentar
          </button>
        </div>
      )}
      <div className="sx-d-pl-dimensions" aria-busy={items.cargando}>
        {modelo.dimensiones.map((d, i) => (
          <article key={d.codigo} className="sx-d-pl-dimension">
            <div className="sx-d-pl-dimension-head">
              <div>
                <p className="sx-d-eyebrow">
                  Parte {i + 1} de {modelo.dimensiones.length}
                </p>
                <h3>{d.nombre}</h3>
                <p>{d.descripcion}</p>
              </div>
              <div className="sx-d-pl-dimension-zone">
                <ZoneChips partida={d.zonaPartida} llegada={d.zonaLlegada} />
                {modelo.completo && (
                  <p>
                    Completaste {d.actividades} {d.actividades === 1 ? 'actividad' : 'actividades'} de esta parte
                  </p>
                )}
              </div>
            </div>
            {bajo(d) && (
              <p className="sx-d-pl-notice">
                <strong>Ahora lo ves distinto.</strong> Al conocerte más, a veces notas lo que aún te falta descubrir.
                No es un retroceso: es una pista para seguir explorando.
              </p>
            )}
            {modelo.completo ? (
              <ItemsComparados dimension={d} />
            ) : (
              !items.cargando && !items.error && <ItemComparisonGrid modo="partida" items={d.items} cabecera />
            )}
          </article>
        ))}
      </div>
    </Parchment>
  )
}

function ItemsComparados({ dimension: d }: { dimension: DimensionPartidaLlegada }) {
  return (
    <>
      {d.cambiaron.length > 0 ? (
        <ItemComparisonGrid modo="cambio" items={d.cambiaron} cabecera />
      ) : (
        <p className="sx-d-pl-same">En esta parte respondiste lo mismo al inicio y al cierre.</p>
      )}
      {d.mantenidos.length > 0 && (
        <details className="sx-d-pl-kept-items">
          <summary>
            {d.mantenidos.length === 1
              ? '1 respuesta se mantuvo'
              : `${d.mantenidos.length} respuestas se mantuvieron`}
          </summary>
          <ItemComparisonGrid modo="igual" items={d.mantenidos} cabecera={d.cambiaron.length === 0} />
        </details>
      )}
    </>
  )
}
