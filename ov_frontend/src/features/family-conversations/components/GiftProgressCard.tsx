import { getGiftResource } from '@/features/family-conversations/lib/conversations'

import { Bookmark, Gift, Sparkles } from 'lucide-react'

import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/Dialog'
import { Progress } from '@/components/ui/Progress'
import { updateAdventure, useAdventure } from '@/store/adventureStore'

import { familyConversationTopics, type ConversationAudience } from '@/data/content/familyConversations'

export function GiftProgressCard({
  audience,
  canOpen,
  completed,
  completedCount,
  open,
  onOpenChange,
}: {
  audience: ConversationAudience
  canOpen: boolean
  completed: boolean
  completedCount: number
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const state = useAdventure()
  const { resourceId, saved, letter } = getGiftResource(state, audience)

  function saveLetter() {
    if (saved) return
    updateAdventure((current) => ({
      ...current,
      bookmarks: [...new Set([...current.bookmarks, resourceId])],
    }))
  }

  return (
    <section className="mb-6 rounded-3xl border bg-card p-5 shadow-sm sm:p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-[var(--family-gift-icon-bg)] text-[var(--family-gift-icon-text)]">
            <Gift className="size-5" />
          </span>
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.12em] text-muted-foreground">
              {completed ? 'Regalo desbloqueado' : 'Un regalo para el final'}
            </p>
            <p className="mt-1 font-bold">
              {completedCount} de {familyConversationTopics.length} temas conversados
            </p>
          </div>
        </div>
        <Button disabled={!canOpen} onClick={() => onOpenChange(true)} size="sm" variant="outline">
          <Sparkles /> Visualizar regalo
        </Button>
      </div>
      <Progress
        aria-label={`${completedCount} de ${familyConversationTopics.length} temas conversados`}
        className="mt-4"
        value={(completedCount / familyConversationTopics.length) * 100}
      />
      <p className="mt-3 text-xs leading-5 text-muted-foreground">
        Avancen a su ritmo. En este prototipo puedes previsualizar la carta antes de completar todos los
        temas.
      </p>

      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl overflow-hidden border-[var(--family-letter-border)] bg-[var(--family-warm-surface)] p-0">
          <div className="bg-[image:var(--family-letter-image)] [.theme-staff_&]:bg-card p-6 sm:p-9">
            <DialogHeader>
              <Badge
                className="w-fit bg-[var(--family-letter-badge)] text-[var(--family-letter-label)]"
                variant="secondary"
              >
                <Gift className="size-3.5" /> Una carta para ti
              </Badge>
              <DialogTitle>
                {audience === 'student' ? 'Una nota de tu familia' : 'Una nota de tu hijo/a'}
              </DialogTitle>
              <DialogDescription>Un recuerdo para volver a leer cuando lo necesites.</DialogDescription>
            </DialogHeader>
            <div className="rounded-2xl border border-[var(--family-letter-border)]/80 bg-card/80 p-5 shadow-sm sm:p-7">
              <p className="whitespace-pre-wrap font-serif text-lg leading-9 text-[var(--family-letter-text)]">
                {letter}
              </p>
              <p className="mt-6 border-t border-[var(--family-letter-border)] pt-5 text-sm leading-7 text-[var(--family-letter-secondary)]">
                Este espacio seguirá disponible. Pueden revisar sus respuestas y volver a conversar sobre
                cualquier tema cuando quieran retomarlo.
              </p>
            </div>
            <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
              <p data-family-letter-caption className="text-xs text-[var(--family-letter-label)]/70">
                {saved
                  ? 'La nota está guardada en Mis recursos.'
                  : 'Puedes conservar esta nota en Mis recursos.'}
              </p>
              <Button disabled={saved} onClick={saveLetter}>
                <Bookmark /> {saved ? 'Guardada en Mis recursos' : 'Guardar en Mis recursos'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </section>
  )
}
