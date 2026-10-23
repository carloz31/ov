import { ResultOverview } from './ResultOverview'
import { PartidaLlegadaSynthesis } from './PartidaLlegadaSynthesis'
import { ZonePathGrid } from './ZonePathGrid'
import { ZoneGuide } from './ZoneGuide'
import { PartidaLlegadaAnswers } from './PartidaLlegadaAnswers'
import type { ModeloPartidaLlegada } from '../lib/partidaLlegada'

// F03 (HU-094) y su ajuste: vista explicada de partida y llegada, sin puntajes. Panel oscuro (síntesis y
// camino de cada parte), guía de zonas y respuestas por dimensión.
export function PartidaLlegadaResult({
  modelo,
  cargandoItems,
  errorItems,
  reintentarItems,
  guia,
  setGuia,
}: {
  modelo: ModeloPartidaLlegada
  cargandoItems: boolean
  errorItems: string
  reintentarItems: () => void
  guia: boolean
  setGuia: (abierta: boolean) => void
}) {
  return (
    <>
      <ResultOverview>
        <PartidaLlegadaSynthesis modelo={modelo} />
        <ZonePathGrid modelo={modelo} guia={guia} abrirGuia={() => setGuia(!guia)} />
      </ResultOverview>
      {guia && <ZoneGuide cerrar={() => setGuia(false)} />}
      <PartidaLlegadaAnswers
        modelo={modelo}
        items={{ cargando: cargandoItems, error: errorItems, reintentar: reintentarItems }}
      />
    </>
  )
}
