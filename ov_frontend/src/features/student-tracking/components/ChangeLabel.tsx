import { ArrowDown, ArrowRight, ArrowUp } from 'lucide-react'

export function ChangeLabel({ value }: { value: string }) {
  const Icon = value === 'Subió' ? ArrowUp : value === 'Bajó' ? ArrowDown : ArrowRight
  return (
    <span className="inline-flex items-center gap-1.5 text-muted-foreground">
      <Icon className="size-4 shrink-0" aria-hidden />
      {value}
    </span>
  )
}
