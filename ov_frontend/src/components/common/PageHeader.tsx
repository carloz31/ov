import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

type PageHeaderProps = {
  actions?: ReactNode
  className?: string
  description?: string
  eyebrow?: string
  title: string
}

function PageHeader({ actions, className, description, eyebrow, title }: PageHeaderProps) {
  return (
    <header className={cn('flex flex-wrap items-end justify-between gap-4', className)}>
      <div>
        {eyebrow && <p className="text-xs font-bold uppercase tracking-[0.16em] text-primary">{eyebrow}</p>}
        <h1 className={cn('text-2xl font-bold', eyebrow && 'mt-1')}>{title}</h1>
        {description && <p className="mt-2 text-sm text-muted-foreground">{description}</p>}
      </div>
      {actions && <div className="shrink-0">{actions}</div>}
    </header>
  )
}

export { PageHeader }
