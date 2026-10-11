import { CircleCheck, Minus } from 'lucide-react'

export function CompletionMark({ complete }: { complete: boolean }) {
  return (
    <span
      aria-label={complete ? 'Completada' : 'No completada'}
      className={`inline-flex size-7 shrink-0 items-center justify-center rounded-full ${complete ? 'bg-success-soft text-success-text' : 'bg-muted text-muted-foreground'}`}
      title={complete ? 'Completada' : 'No completada'}
    >
      {complete ? <CircleCheck className="size-4" /> : <Minus className="size-4" />}
    </span>
  )
}
