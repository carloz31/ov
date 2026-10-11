import { LockKeyhole } from 'lucide-react'
import type { ReactNode } from 'react'

export function EmptyMessage({
  children,
  unavailable = false,
}: {
  children: ReactNode
  unavailable?: boolean
}) {
  return (
    <p className="flex items-start gap-2 rounded-lg bg-muted/50 p-4 text-muted-foreground">
      {unavailable && <LockKeyhole className="mt-0.5 size-4 shrink-0" aria-hidden />}
      {children}
    </p>
  )
}
