import { X } from 'lucide-react'
import { Parchment } from '@/components/student/Parchment'
import { zonaEnPalabras } from '@/lib/servidor/adaptadoresInstrumentos'
import type { ZonaDimension } from '@/types/servidor'
import { ZONAS } from '../lib/partidaLlegada'

// Ajuste de F03: «¿Qué significa cada zona?», con el mismo comportamiento que la guía de intereses. Sin
// números, promedios ni umbrales.
const SIGNIFICADOS: Record<ZonaDimension, string> = {
  POR_TRABAJAR:
    'Es una parte del camino donde aún hay mucho por descubrir. Las actividades te ayudan a avanzar en ella.',
  EN_CAMINO: 'Ya diste pasos en esta parte. Seguir explorando te ayuda a afirmarla.',
  FUERTE: 'Te sientes seguro en esta parte. Puede ser tu punto de apoyo para las demás.',
}

export function ZoneGuide({ cerrar }: { cerrar: () => void }) {
  return (
    <Parchment id="guia-zonas" className="sx-d-result-panel sx-d-result-guide" aria-labelledby="titulo-guia-zonas">
      <div className="sx-d-result-section-head">
        <div>
          <p className="sx-d-eyebrow">Guía rápida</p>
          <h2 id="titulo-guia-zonas">¿Qué significa cada zona?</h2>
        </div>
        <button type="button" className="sx-d-action sx-d-action-ghost" aria-label="Cerrar guía" onClick={cerrar}>
          <X aria-hidden="true" />
        </button>
      </div>
      <div className="sx-d-result-grid">
        {ZONAS.map((zona) => (
          <article key={zona} className="sx-d-result-card">
            <div>
              <h3>{zonaEnPalabras(zona)}</h3>
              <p>{SIGNIFICADOS[zona]}</p>
            </div>
          </article>
        ))}
      </div>
      <p>Las zonas no son notas: muestran cómo te sientes hoy y pueden cambiar.</p>
    </Parchment>
  )
}
