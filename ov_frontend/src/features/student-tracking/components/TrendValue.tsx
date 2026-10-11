import { ArrowDown, ArrowRight, ArrowUp } from 'lucide-react'

export function TrendValue({ value }: { value: string }) {
  const up = value === 'En aumento'
  const down = value === 'En descenso'
  const Icon = up ? ArrowUp : down ? ArrowDown : ArrowRight
  return (
    <span
      className={`inline-flex max-w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-sm font-medium ${up ? 'bg-success-soft text-success-text' : 'bg-neutral-soft text-neutral-text'}`}
    >
      <Icon className="size-4 shrink-0" aria-hidden />
      {value}
    </span>
  )
}
