import type { ReactNode } from 'react'
import { type LucideIcon } from 'lucide-react'

import { Progress } from '@/components/ui/Progress'

export function StaffMetric({
  label,
  value,
  percent,
  detail,
  primary = false,
  children,
  icon: Icon,
}: {
  label: string
  value: ReactNode
  percent?: number
  detail?: ReactNode
  primary?: boolean
  children?: ReactNode
  icon?: LucideIcon
}) {
  return (
    <section className="staff-metric" data-primary={primary}>
      <div className="staff-metric-heading">
        <h2>
          {Icon && <Icon aria-hidden="true" className="size-4 shrink-0" />}
          {label}
        </h2>
        <strong>{value}</strong>
      </div>
      {percent !== undefined && <Progress intent="data" value={percent} aria-label={label} />}
      {detail && <p className="staff-metric-detail">{detail}</p>}
      {children}
    </section>
  )
}
