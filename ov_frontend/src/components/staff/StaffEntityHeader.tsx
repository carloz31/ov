import type { ReactNode } from 'react'

import { Card } from '@/components/ui/Card'

import { cn } from '@/lib/utils'

export function StaffEntityHeader({
  title,
  initials,
  details,
  metrics,
  children,
  heading = 'h1',
  className,
}: {
  title: string
  initials: string
  details?: ReactNode
  metrics?: ReactNode
  children?: ReactNode
  heading?: 'h1' | 'h2' | 'h3'
  className?: string
}) {
  const Heading = heading
  return (
    <Card className={cn('staff-entity-header', className)}>
      <header className="staff-entity-row">
        <div className="staff-entity-identity">
          <span className="staff-entity-avatar" aria-hidden="true">
            {initials}
          </span>
          <div className="staff-entity-copy">
            <Heading>{title}</Heading>
            {details && <div className="staff-entity-details">{details}</div>}
          </div>
        </div>
        {metrics && <div className="staff-entity-metrics">{metrics}</div>}
      </header>
      {children && <div className="staff-entity-body">{children}</div>}
    </Card>
  )
}
