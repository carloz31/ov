import { CircleHelp, Volume2, VolumeX } from 'lucide-react'
import { updateStudentUi, useStudentUi } from '@/store/studentUiStore'

// Ajuste desbloqueos: lo que abre el botón de ayuda (la guía de Lumi o, antes de la primera misión, la ayuda sin
// Lumi) lo decide quien pasa `onHelp`.
export function MapControls({ onHelp }: { onHelp: () => void }) {
  const ui = useStudentUi()
  const SoundIcon = ui.soundOn ? Volume2 : VolumeX
  return (
    <div className="sx-map-controls">
      <button
        type="button"
        className="sx-glass sx-icon-button"
        aria-label="Abrir guía"
        onClick={onHelp}
      >
        <CircleHelp size={20} />
      </button>
      <button
        type="button"
        className="sx-glass sx-icon-button"
        aria-label={ui.soundOn ? 'Silenciar' : 'Activar sonido'}
        aria-pressed={ui.soundOn}
        onClick={() => updateStudentUi((current) => ({ ...current, soundOn: !current.soundOn }))}
      >
        <SoundIcon size={20} />
      </button>
    </div>
  )
}
