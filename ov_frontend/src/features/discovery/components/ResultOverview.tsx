import type { ReactNode } from 'react'
import { Parchment } from '@/components/student/Parchment'

export function ResultOverview({ children }: { children: ReactNode }) {
  return <Parchment className="sx-d-result-panel sx-d-result-overview">{children}</Parchment>
}
