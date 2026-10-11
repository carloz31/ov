import { useRef, useState } from 'react'
import { ShieldCheck, Star, X } from 'lucide-react'
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/Dialog'
import '../styles/forest-fire-workspace.css'

export function ForestFireCaseHeader({
  label,
  progress,
  budgetRemaining,
  finished,
  children,
  onClose,
}: {
  label: string
  progress: number
  budgetRemaining: number
  finished?: boolean
  children?: React.ReactNode
  onClose: () => void
}) {
  const [exitOpen, setExitOpen] = useState(false)
  const exitButton = useRef<HTMLButtonElement>(null)
  return (
    <>
      <header className="ff-header">
        <div className="ff-heading-row">
          <button
            ref={exitButton}
            className="ff-icon-button"
            aria-label="Salir del caso"
            onClick={() => setExitOpen(true)}
          >
            <X />
          </button>
          <div className="ff-heading">
            <span>Central de casos · Incendio forestal</span>
            <strong>{label}</strong>
          </div>
          {children}
          <div className="ff-budget">
            <span>Presupuesto</span>
            <strong>{budgetRemaining} de 16</strong>
          </div>
        </div>
        <div
          className="ff-progress"
          role="progressbar"
          aria-label="Avance del caso"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={progress}
        >
          <div style={{ width: `${progress}%` }} />
          <Star aria-hidden="true" fill="currentColor" style={{ left: `${progress}%` }} />
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
            {finished
              ? 'Tu resultado ya está guardado. Puedes volver a jugar el caso cuando quieras.'
              : 'Este intento no se guardará. Tendrás que empezar el caso de nuevo.'}
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
