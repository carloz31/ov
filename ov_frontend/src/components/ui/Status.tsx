import { CheckCircle2, Circle, Clock3, LockKeyhole, TriangleAlert, type LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'
import { Badge } from './Badge'
import { cn } from '@/lib/utils'

type Status = 'completed' | 'in-progress' | 'not-started' | 'unavailable'
export type { Status }
const states = {
  completed: { icon: CheckCircle2, label: 'Completado', variant: 'success' },
  'in-progress': { icon: Clock3, label: 'En progreso', variant: 'default' },
  'not-started': { icon: Circle, label: 'No iniciado', variant: 'neutral' },
  unavailable: { icon: LockKeyhole, label: 'Aún no disponible', variant: 'neutral' },
} as const

export function StatusBadge({ status, children }: { status: Status; children?: ReactNode }) {
  const { icon: Icon, label, variant } = states[status]
  return (
    <Badge
      variant={variant}
      className="gap-1.5 whitespace-normal text-left font-medium"
      aria-label={
        typeof children === 'string' && children.endsWith(' %') ? `${label}: ${children}` : undefined
      }
    >
      <Icon className="size-3.5 shrink-0" aria-hidden />
      {children ?? label}
    </Badge>
  )
}

export function AlertBadge({
  critical = false,
  children,
  className,
}: {
  critical?: boolean
  children: ReactNode
  className?: string
}) {
  return (
    <Badge
      variant={critical ? 'attention' : 'aviso'}
      className={cn('whitespace-normal font-normal', className)}
    >
      {critical && <TriangleAlert className="size-3.5 shrink-0" aria-hidden />}
      {children}
    </Badge>
  )
}

export function CardIcon({ icon: Icon, className }: { icon: LucideIcon; className?: string }) {
  return (
    <span
      data-slot="card-icon"
      className={cn(
        'flex size-10 shrink-0 items-center justify-center rounded-full bg-primary-soft text-primary',
        className,
      )}
    >
      <Icon className="size-5" aria-hidden />
    </span>
  )
}
