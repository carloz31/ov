import { ArrowRight } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import type { RoleOption } from '../types'

type RoleOptionCardProps = {
  option: RoleOption
  onSelect: () => void
}

function RoleOptionCard({ option, onSelect }: RoleOptionCardProps) {
  const Icon = option.icon

  return (
    <button className="group h-full text-left" onClick={onSelect} type="button">
      <Card className="relative h-full overflow-hidden p-6 shadow-[var(--shadow-card)] transition duration-300 hover:-translate-y-1 hover:border-primary/30 hover:shadow-[var(--shadow-float)] sm:p-7">
        <div
          className={`mb-8 flex size-13 items-center justify-center rounded-2xl shadow-sm ${option.accentClass}`}
        >
          <Icon className="size-6" />
        </div>
        <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.18em] text-primary">
          {option.eyebrow}
        </p>
        <h2 className="text-xl font-bold text-foreground">{option.label}</h2>
        <p className="mt-2 min-h-12 text-sm leading-6 text-muted-foreground">{option.description}</p>
        <span className="mt-7 inline-flex items-center gap-2 text-sm font-semibold text-foreground">
          Ingresar <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
        </span>
      </Card>
    </button>
  )
}

export { RoleOptionCard }
