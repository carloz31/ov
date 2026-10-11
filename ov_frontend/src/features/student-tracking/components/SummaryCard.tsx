import { CardIcon } from '@/components/ui/Status'

import { Link } from 'react-router'
import { ArrowRight, type LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'

import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'

export function SummaryCard({
  title,
  icon: Icon,
  to,
  action,
  children,
}: {
  title: string
  icon: LucideIcon
  to: string
  action: string
  children: ReactNode
}) {
  return (
    <Card className="min-w-0 space-y-4 rounded-xl p-4 sm:p-5">
      <div className="flex items-center gap-3">
        <CardIcon icon={Icon} />
        <h2 className="text-base font-bold">{title}</h2>
      </div>
      <div className="space-y-3">{children}</div>
      <Button
        asChild
        variant="outline"
        className="min-h-11 h-auto w-full justify-between gap-2 whitespace-normal text-left"
      >
        <Link to={to}>
          {action}
          <ArrowRight className="size-4 shrink-0" aria-hidden />
        </Link>
      </Button>
    </Card>
  )
}
