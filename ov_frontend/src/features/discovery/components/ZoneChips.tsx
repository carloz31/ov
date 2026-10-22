import { ArrowRight } from 'lucide-react'
import { zonaEnPalabras } from '@/lib/servidor/adaptadoresInstrumentos'
import type { ZonaDimension } from '@/types/servidor'
import '../styles/partida-llegada.css'

// Ajuste de F03: la zona de una dimensión. Sin llegada, un chip neutro; si cambió, partida → llegada
// (resaltada); si se mantuvo, «Se mantuvo» y un solo chip. Subir o bajar se pinta igual.
export function ZoneChips({ partida, llegada }: { partida: ZonaDimension; llegada?: ZonaDimension }) {
  const chip = <span className="sx-d-pl-chip">{zonaEnPalabras(partida)}</span>
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
      {chip}
      <ArrowRight className="sx-d-pl-arrow" aria-label="a" />
      <span className="sx-d-pl-chip sx-d-pl-chip-strong">{zonaEnPalabras(llegada)}</span>
    </span>
  )
}
