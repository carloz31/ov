import { AlertBadge } from '@/components/ui/Status'

import { type AlertCode } from '@/features/counselor/data/exampleStudents'

import { profileAlertLabels as alertLabels } from '@/features/student-tracking/lib/selectors'

export function AlertList({ alertas, centered = false }: { alertas: AlertCode[]; centered?: boolean }) {
  if (!alertas.length) return <span className="text-muted-foreground">Ninguna</span>
  return (
    <div className={`flex flex-wrap gap-1.5 ${centered ? 'justify-center' : ''}`}>
      {alertas.map((alerta) => (
        <AlertBadge key={alerta} className="text-sm">
          {alertLabels[alerta]}
        </AlertBadge>
      ))}
    </div>
  )
}
