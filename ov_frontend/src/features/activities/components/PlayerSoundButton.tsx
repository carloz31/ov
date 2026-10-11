import { Volume2, VolumeX } from 'lucide-react'
import { updateStudentUi, useStudentUi } from '@/store/studentUiStore'

export function PlayerSoundButton() {
  const ui = useStudentUi()
  return (
    <button
      type="button"
      className="sx-icon-button"
      aria-label={ui.soundOn ? 'Silenciar' : 'Activar sonido'}
      aria-pressed={ui.soundOn}
      onClick={() => updateStudentUi((current) => ({ ...current, soundOn: !current.soundOn }))}
    >
      {ui.soundOn ? <Volume2 size={20} /> : <VolumeX size={20} />}
    </button>
  )
}
