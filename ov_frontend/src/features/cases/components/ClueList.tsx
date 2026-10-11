import { Dialog, DialogContent, DialogDescription, DialogTitle, DialogTrigger } from '@/components/ui/Dialog'

import type { ForestFirePhase } from '@/types/cases'

export function ClueList({
  phase,
  label = 'Ver completo',
  onOpen,
}: {
  phase: ForestFirePhase
  label?: string
  onOpen?: () => void
}) {
  return (
    <Dialog
      onOpenChange={(open) => {
        if (open) onOpen?.()
      }}
    >
      <DialogTrigger asChild>
        <button className="ff-secondary">{label}</button>
      </DialogTrigger>
      <DialogContent className="ff-modal ff-responsive-modal">
        <DialogTitle>Lo que dijo la comunidad</DialogTitle>
        <DialogDescription>
          Las {phase.messages.length} pistas de la {phase.name.toLowerCase()}.
        </DialogDescription>
        <div className="ff-clue-list">
          {phase.messages.map((message, index) => (
            <article key={message.id}>
              <p className="ff-eyebrow">
                Pista {index + 1} de {phase.messages.length}
              </p>
              <h3>{message.speaker}</h3>
              <p>{message.context}</p>
              <blockquote>“{message.message}”</blockquote>
            </article>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  )
}
