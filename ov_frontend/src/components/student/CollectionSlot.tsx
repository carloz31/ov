import type { ReactNode } from 'react'
export function CollectionSlot({
  children,
  icon,
  collected = true,
  compact = false,
  group,
}: {
  children: ReactNode
  icon?: ReactNode
  collected?: boolean
  compact?: boolean
  group?: number
}) {
  return (
    <div
      className="sx-d-slot"
      data-collected={collected}
      data-compact={compact}
      data-group={group}
      title={compact && typeof children === 'string' ? children : undefined}
    >
      <span aria-hidden="true">{icon}</span>
      <strong>{children}</strong>
    </div>
  )
}
