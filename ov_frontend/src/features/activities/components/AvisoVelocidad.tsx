import { Sparkles } from 'lucide-react'
import { AvisoToast } from '@/components/student/AvisoToast'
import { getCharacterVisual } from '@/data/content/characters'
import { textoAvisoVelocidad } from '../lib/avisoVelocidad'

const DURACION_AVISO = 8000

// HU-096: Lumi avisa dentro de la actividad, sin bloquear; no pasa por la cola de novedades.
export function AvisoVelocidad({
  numero,
  hablanteId,
  onDismiss,
}: {
  numero: number
  hablanteId: string
  onDismiss: () => void
}) {
  return (
    <div className="sx-aviso-velocidad">
      <AvisoToast
        icono={Sparkles}
        titulo="Lumi"
        descripcion={textoAvisoVelocidad(numero, hablanteId, getCharacterVisual(hablanteId).name)}
        duracion={DURACION_AVISO}
        parrafo
        onDismiss={onDismiss}
      />
    </div>
  )
}
