import { useCallback, useState } from 'react'
import { CircleHelp, Volume2, VolumeX } from 'lucide-react'
import { updateStudentUi, useStudentUi } from '@/store/studentUiStore'
import { AvisoAyudaMapa } from './AvisoAyudaMapa'

// Ajuste lumi-mensajes: con `aviso`, el botón de ayuda abre un aviso junto a él en lugar de la guía de Lumi.
export function MapControls({ onHelp, aviso }: { onHelp: () => void; aviso?: string }) {
  const ui = useStudentUi()
  const [avisoAbierto, setAvisoAbierto] = useState(false)
  const cerrarAviso = useCallback(() => setAvisoAbierto(false), [])
  const SoundIcon = ui.soundOn ? Volume2 : VolumeX
  return (
    <div className="sx-map-controls">
      <button
        type="button"
        className="sx-glass sx-icon-button"
        aria-label="Abrir guía"
        onClick={aviso ? () => setAvisoAbierto((abierto) => !abierto) : onHelp}
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
      {aviso && avisoAbierto && <AvisoAyudaMapa texto={aviso} onCerrar={cerrarAviso} />}
    </div>
  )
}
