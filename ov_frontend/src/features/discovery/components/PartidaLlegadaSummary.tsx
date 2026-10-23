import { LockKeyhole } from 'lucide-react'
import { TEXTO_SIN_AVANCE, type ModeloPartidaLlegada } from '../lib/partidaLlegada'
import { ZoneChips } from './ZoneChips'

// Ajuste de F03: zonas de la página I del libro, en sus dos estados (solo partida; partida y llegada).
export function PartidaLlegadaSummary({ modelo }: { modelo: ModeloPartidaLlegada }) {
  const total = modelo.dimensiones.length
  return (
    <div className="sx-d-helena-summary sx-d-pl-summary">
      <p className="sx-d-helena-label">{modelo.completo ? 'Tu partida → tu llegada' : 'Tu punto de partida'}</p>
      <ul className="sx-d-pl-summary-list">
        {modelo.dimensiones.map((d) => (
          <li key={d.codigo}>
            <strong>{d.nombre}</strong>
            <ZoneChips partida={d.zonaPartida} llegada={d.zonaLlegada} />
          </li>
        ))}
      </ul>
      {modelo.completo ? (
        <p className="sx-d-helena-closure">
          {modelo.avanzaron.length > 0
            ? `Avanzaste de zona en ${modelo.avanzaron.length} de ${total} partes. Son zonas, no notas: muestran dónde estás hoy.`
            : TEXTO_SIN_AVANCE}
        </p>
      ) : (
        <p className="sx-d-pl-sealed">
          <LockKeyhole aria-hidden="true" />
          <span>
            <strong>Tu punto de llegada</strong> se revela al final del camino, cuando vuelvas a responder.
          </span>
        </p>
      )}
    </div>
  )
}
