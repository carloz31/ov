import { StatusBadge } from '@/components/ui/Status'

import type { ActivityState } from '@/types/studentProfile'

export function ActivityStatus({ state, label }: { state: ActivityState | 'unavailable'; label?: string }) {
  return <StatusBadge status={state}>{label}</StatusBadge>
}
