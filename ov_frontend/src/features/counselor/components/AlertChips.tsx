import { Badge } from '@/components/ui/Badge'

import { alertLabels } from '@/features/counselor/lib/counselorPortalSelectors'
import type { AlertCode } from '@/features/counselor/types'

export function AlertChips({ alerts, compact = false }: { alerts: AlertCode[]; compact?: boolean }) {
  return (
    <div className="flex flex-wrap gap-1">
      {alerts.map((alert) => (
        <Badge key={alert} title={alertLabels[alert]} variant="aviso">
          {compact ? alert : alertLabels[alert]}
        </Badge>
      ))}
    </div>
  )
}
