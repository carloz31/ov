import { ChallengeStage } from '@/features/activities/components/challenges/ChallengeStage'
import { useChallengePlayer } from '@/features/activities/hooks/useChallengePlayer'
import { ShieldCheck, X } from 'lucide-react'
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/Dialog'
import { PlayerAmbient } from '../PlayerAmbient'
import { PlayerSoundButton } from '../PlayerSoundButton'
import { ResourceSheet } from '../ResourceSheet'
import type { Challenge } from '@/types/challenges'
export function ChallengePlayer({ challenge: c, onClose }: { challenge: Challenge; onClose: () => void }) {
  const model = useChallengePlayer({ challenge: c })
  const {
    practice,
    stage,
    battle,
    resourcesOpen,
    setResourcesOpen,
    exitOpen,
    setExitOpen,
    closeButton,
    sheets,
    victory,
  } = model
  return (
    <div
      className="fixed inset-0 z-40 sx-root sx-player sx-challenge"
      data-ambient={stage === 'result' && victory ? 'sunrise' : 'night'}
    >
      <PlayerAmbient
        mode={stage === 'result' && victory ? 'sunrise' : 'night'}
        imageUrl="/images/background/afueras.png"
      />
      <header className="sx-player-topbar sx-challenge-topbar">
        <button
          ref={closeButton}
          type="button"
          className="sx-icon-button"
          aria-label="Salir del desafío"
          onClick={() => (stage === 'battle' && !battle?.finished ? setExitOpen(true) : onClose())}
        >
          <X size={20} />
        </button>
        <div className="sx-player-heading">
          <span>Desafío de la ciudad{practice.current ? ' · Práctica' : ''}</span>
          <strong>{c.nombre}</strong>
        </div>
        <PlayerSoundButton />
      </header>
      <ChallengeStage model={model} onClose={onClose} />
      {stage !== 'battle' && (
        <ResourceSheet
          open={resourcesOpen}
          ids={stage === 'result' && victory ? (c.recompensa.recursoIds ?? []) : sheets}
          onClose={() => setResourcesOpen(false)}
        />
      )}
      <Dialog open={exitOpen} onOpenChange={setExitOpen}>
        <DialogContent
          className="sx-root sx-glass-dark sx-player-exit"
          showCloseButton={false}
          onCloseAutoFocus={(e) => {
            e.preventDefault()
            closeButton.current?.focus()
          }}
        >
          <ShieldCheck className="sx-exit-icon" size={48} />
          <DialogTitle>¿Quieres volver a la ciudad?</DialogTitle>
          <DialogDescription>
            Este intento no se guardará. Al volver empezarás desde el inicio del desafío.
          </DialogDescription>
          <div className="sx-player-actions">
            <button type="button" className="sx-secondary-button" onClick={() => setExitOpen(false)}>
              Seguir en el desafío
            </button>
            <button type="button" className="sx-primary-button" onClick={onClose}>
              Volver a la ciudad
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
