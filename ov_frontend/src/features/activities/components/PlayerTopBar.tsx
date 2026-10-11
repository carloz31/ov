import { useRef, useState } from 'react'
import { ShieldCheck, Star, X } from 'lucide-react'
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/Dialog'
import type { Actividad } from '@/types/activities'
import { PlayerSoundButton } from './PlayerSoundButton'

export function PlayerTopBar({
  activity,
  finished,
  index,
  total,
  progress,
  nuevoMomento = false,
  onClose,
}: {
  activity: Actividad
  finished: boolean
  index: number
  total: number
  progress: number
  nuevoMomento?: boolean
  onClose: () => void
}) {
  const [exitOpen, setExitOpen] = useState(false)
  const exitButton = useRef<HTMLButtonElement>(null)
  return (
    <>
      <header className="sx-player-topbar">
        <button
          ref={exitButton}
          type="button"
          className="sx-icon-button"
          aria-label="Salir de la misión"
          onClick={() => setExitOpen(true)}
        >
          <X size={20} />
        </button>
        <div className="sx-player-heading">
          <span>
            {activity.ubicacion ??
              (activity.tipo === 'encuentro'
                ? 'Actividad informativa'
                : activity.tipo === 'registro'
                  ? 'Actividad de registro'
                  : 'Test')}
          </span>
          <strong>{finished ? 'Actividad completada' : activity.titulo}</strong>
        </div>
        <div className="sx-player-step">
          <span>
            Paso {Math.min(index + 1, total)} de {total}
          </span>
        </div>
        <PlayerSoundButton />
        <div
          className="sx-lumi-progress"
          role="progressbar"
          aria-label="Avance de la misión"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={progress}
          aria-valuetext={`Paso ${Math.min(index + 1, total)} de ${total}`}
        >
          <span className="sx-progress-track">
            <span className="barra-pista" style={{ width: `${100 - progress}%` }} />
          </span>
          <span
            className="barra-estrella"
            style={{
              left: `${progress}%`,
              filter: `drop-shadow(0 0 ${3 + (9 * progress) / 100}px rgba(255,214,102,.95))`,
            }}
            aria-hidden="true"
          >
            <Star size={20} fill="currentColor" />
            {(nuevoMomento || progress === 100) && <i key={`${index}-${progress}`} className="anim-spark" />}
          </span>
        </div>
      </header>
      <Dialog open={exitOpen} onOpenChange={setExitOpen}>
        <DialogContent
          className="sx-root sx-glass-dark sx-player-exit"
          aria-label="Salir de la actividad"
          showCloseButton={false}
          onCloseAutoFocus={(event) => {
            event.preventDefault()
            exitButton.current?.focus()
          }}
        >
          <ShieldCheck className="sx-exit-icon" size={48} />
          <DialogTitle>¿Quieres volver al mapa?</DialogTitle>
          <DialogDescription>
            Tu avance ya está guardado. Podrás retomar la actividad desde este punto.
          </DialogDescription>
          <div className="sx-player-actions">
            <button type="button" className="sx-secondary-button" onClick={() => setExitOpen(false)}>
              Seguir en la actividad
            </button>
            <button type="button" className="sx-primary-button" onClick={onClose}>
              Volver al mapa
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
