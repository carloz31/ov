import { LockKeyhole } from 'lucide-react'
import {
  TEXTO_SIN_AVANCE,
  conteoZonaEnPalabras,
  listaNombres,
  type ModeloPartidaLlegada,
} from '../lib/partidaLlegada'

// Ajuste de F03: columna izquierda del panel oscuro de partida y llegada (síntesis), en sus dos estados.
export function PartidaLlegadaSynthesis({ modelo }: { modelo: ModeloPartidaLlegada }) {
  const total = modelo.dimensiones.length
  const avanzaron = modelo.avanzaron.length
  if (!modelo.completo)
    return (
      <section className="sx-d-pl-synthesis" aria-labelledby="sintesis-partida">
        <p className="sx-d-eyebrow">Tu punto de partida</p>
        <h2 id="sintesis-partida">Así empiezas el camino.</h2>
        <ul className="sx-d-pl-counters">
          {modelo.conteoZonas.map((c) => (
            <li key={c.zona}>{conteoZonaEnPalabras(c)}</li>
          ))}
        </ul>
        <p>
          Empezar con varias partes por trabajar es lo más común: para eso es el camino. Cada actividad te ayuda
          con alguna de ellas.
        </p>
        <p className="sx-d-pl-sealed">
          <LockKeyhole aria-hidden="true" />
          <span>
            <strong>Tu punto de llegada</strong> Se revela al final del camino. Entonces verás, parte por parte y
            respuesta por respuesta, qué cambió.
          </span>
        </p>
      </section>
    )
  return (
    <section className="sx-d-pl-synthesis" aria-labelledby="sintesis-recorrido">
      <p className="sx-d-eyebrow">Tu recorrido</p>
      <h2 id="sintesis-recorrido">
        {avanzaron > 0 ? `Avanzaste de zona en ${avanzaron} de las ${total} partes de tu camino.` : TEXTO_SIN_AVANCE}
      </h2>
      <ul className="sx-d-pl-counters">
        {avanzaron > 0 && <li>{avanzaron} avanzaron</li>}
        <li>{total - avanzaron} se mantuvieron o cambiaron</li>
      </ul>
      {avanzaron > 0 && (
        <p>
          Lo que más cambió fue <strong>{listaNombres(modelo.avanzaron)}</strong>. Abajo puedes ver, respuesta por
          respuesta, qué cambió.
        </p>
      )}
      <p className="sx-d-result-note">Las zonas no te califican: son pistas para tu próximo paso.</p>
    </section>
  )
}
