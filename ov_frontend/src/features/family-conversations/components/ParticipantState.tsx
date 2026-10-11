import { Check } from 'lucide-react'

import { cn } from '@/lib/utils'

export function ParticipantState({
  answered,
  initials,
  label,
  marked,
}: {
  answered: boolean
  initials: string
  label: string
  marked: boolean
}) {
  return (
    <span
      className={cn(
        'relative grid size-9 place-items-center rounded-full border-2 border-[var(--family-white-border)] text-[11px] font-black shadow-sm',
        answered
          ? 'bg-[var(--family-participant)] text-primary-foreground'
          : 'bg-card/75 text-foreground/40 [.theme-staff_&]:text-muted-foreground',
      )}
      title={`${label}: ${answered ? 'respondió' : 'respuesta pendiente'}${marked ? ' y ya conversó' : ''}`}
    >
      {initials}
      {marked && (
        <span className="absolute -bottom-1 -right-1 grid size-4 place-items-center rounded-full border border-[var(--family-white-border)] bg-[var(--family-completed)] text-primary-foreground">
          <Check className="!size-2.5" />
        </span>
      )}
      <span className="sr-only">{`${label}: ${answered ? 'respondió' : 'respuesta pendiente'}${marked ? ' y ya conversó' : ''}`}</span>
    </span>
  )
}
