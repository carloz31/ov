import { Flag } from 'lucide-react'
import { zonaEnPalabras } from '@/lib/servidor/adaptadoresInstrumentos'
import type { ZonaDimension } from '@/types/servidor'
import { ZONAS, posicionZona } from '../lib/partidaLlegada'
import '../styles/partida-llegada.css'

// Ajuste de F03: mini camino de tres paradas (Por trabajar · En camino · Fuerte). Banderín vacío en la
// partida y lleno en la llegada; las paradas y el tramo entre ambas van en dorado. Solo partida: un banderín
// y nada iluminado.
export function ZonePath({ partida, llegada }: { partida: ZonaDimension; llegada?: ZonaDimension }) {
  const desde = posicionZona(partida)
  const hasta = llegada ? posicionZona(llegada) : desde
  const [min, max] = [Math.min(desde, hasta), Math.max(desde, hasta)]
  const iluminado = (i: number) => !!llegada && i >= min && i <= max
  const etiqueta = llegada
    ? `Empezaste en ${zonaEnPalabras(partida)}; hoy estás en ${zonaEnPalabras(llegada)}`
    : `Empiezas en ${zonaEnPalabras(partida)}`
  return (
    <span className="sx-d-pl-path" role="img" aria-label={etiqueta}>
      {ZONAS.map((zona, i) => (
        <span
          key={zona}
          className={[
            'sx-d-pl-stop',
            iluminado(i) && 'sx-d-pl-lit',
            iluminado(i) && iluminado(i - 1) && 'sx-d-pl-lit-left',
            iluminado(i) && iluminado(i + 1) && 'sx-d-pl-lit-right',
          ]
            .filter(Boolean)
            .join(' ')}
        >
          <span className="sx-d-pl-dot" />
          <span className="sx-d-pl-flags" aria-hidden="true">
            {i === desde && <Flag className="sx-d-pl-flag" />}
            {llegada && i === hasta && <Flag className="sx-d-pl-flag sx-d-pl-flag-full" fill="currentColor" />}
          </span>
        </span>
      ))}
    </span>
  )
}
