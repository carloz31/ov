import type { ReactNode } from 'react'

import { Card } from '@/components/ui/Card'

export function Panel({ title, children, id }: { title: string; children: ReactNode; id?: string }) {
  return (
    <Card id={id} className="min-w-0 scroll-mt-6 rounded-xl p-4 sm:p-5">
      <h2 className="mb-4 text-lg font-bold">{title}</h2>
      {children}
    </Card>
  )
}
