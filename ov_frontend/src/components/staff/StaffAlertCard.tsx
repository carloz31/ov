import type { ReactNode } from 'react'
import { TriangleAlert } from 'lucide-react'
import { Card } from '@/components/ui/Card'

import { cn } from '@/lib/utils'

export function StaffAlertCard({
  title,
  children,
  className,
  actions,
}: {
  title: string
  children?: ReactNode
  className?: string
  actions?: ReactNode
}) {
  return (
    <Card className={cn('staff-alert-card', className)}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="staff-alert-heading">
          <span className="staff-alert-icon">
            <TriangleAlert aria-hidden="true" />
          </span>
          {title}
        </h2>
        {actions}
      </div>
      {children}
    </Card>
  )
}
