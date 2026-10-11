import { CircleCheck, CircleX, Minus } from 'lucide-react'

export function CardPartStatus({ complete, partial }: { complete: boolean; partial: boolean }) {
  if (partial)
    return (
      <span
        aria-label="En progreso"
        className="inline-flex size-6 items-center justify-center rounded-full bg-primary-soft text-primary"
      >
        <Minus className="size-4" />
      </span>
    )
  if (complete)
    return (
      <span
        aria-label="Completa"
        className="inline-flex size-6 items-center justify-center rounded-full bg-success-soft text-success-text"
      >
        <CircleCheck className="size-4" />
      </span>
    )
  return (
    <span
      aria-label="Sin completar"
      className="inline-flex size-6 items-center justify-center rounded-full bg-neutral-soft text-neutral-text"
    >
      <CircleX className="size-4" />
    </span>
  )
}
