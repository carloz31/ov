import type { ReactNode } from 'react'

import { Card } from '@/components/ui/Card'

import { StaffAlertCard } from '@/components/staff/StaffAlertCard'

export function Section({ title, children }: { title: string; children: ReactNode }) {
  if (title === 'Alertas') {
    return (
      <StaffAlertCard title={title} className="flex min-w-0 flex-col gap-4 p-5 sm:p-6">
        {children}
      </StaffAlertCard>
    )
  }
  return (
    <Card className="flex min-w-0 flex-col gap-5 rounded-xl p-5 sm:p-6">
      <h2 className="text-base font-bold">{title}</h2>
      {children}
    </Card>
  )
}
