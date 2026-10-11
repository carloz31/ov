import { TriangleAlert, CircleCheck } from 'lucide-react'

import { Badge } from '@/components/ui/Badge'
import { cn } from '@/lib/utils'

import type { TrafficLight } from '@/features/counselor/types'

const trafficLabels: Record<TrafficLight, string> = {
  priority: 'Prioritario',
  attention: 'Atención',
  'on-track': 'En ruta',
}

export function TrafficBadge({ status }: { status: TrafficLight }) {
  return (
    <Badge
      className={cn(
        status === 'priority' && 'bg-warning-soft text-warning-text',
        status === 'attention' && 'bg-warning-soft text-warning-text',
      )}
      variant={status === 'on-track' ? 'neutral' : 'aviso'}
    >
      {status === 'on-track' ? (
        <CircleCheck className="size-3.5" aria-hidden />
      ) : (
        <TriangleAlert className="size-3.5" aria-hidden />
      )}
      {trafficLabels[status]}
    </Badge>
  )
}
