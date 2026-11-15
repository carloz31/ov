import { ArrowRight } from 'lucide-react'
import { zonaEnPalabras } from '@/lib/servidor/adaptadoresInstrumentos'
import type { ZonaDimension } from '@/types/servidor'
import { claseChipZona } from '../lib/partidaLlegada'
import '../styles/partida-llegada.css'

// Ajuste de F03: la zona de una dimensión. Ajuste color-partida-llegada: cada chip con el tono de su zona; si
// cambió, la partida en contorno neutro → la llegada con su tono; si se mantuvo, «Se mantuvo» y un chip con su tono.
export function ZoneChips({ partida, llegada }: { partida: ZonaDimension; llegada?: ZonaDimension }) {
  const chip = <span className={claseChipZona(partida)}>{zonaEnPalabras(partida)}</span>
  if (!llegada) return <span className="sx-d-pl-zones">{chip}</span>
  if (llegada === partida)
    return (
      <span className="sx-d-pl-zones">
        <span className="sx-d-pl-kept">Se mantuvo</span>
        {chip}
      </span>
    )
  return (
    <span className="sx-d-pl-zones">
      <span className="sx-d-pl-chip sx-d-pl-chip-outline">{zonaEnPalabras(partida)}</span>
      <ArrowRight className="sx-d-pl-arrow" aria-hidden="true" />
      <span className="sr-only">ahora</span>
      <span className={claseChipZona(llegada)}>{zonaEnPalabras(llegada)}</span>
    </span>
  )
}
