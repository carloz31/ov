import { StaffMetric } from '@/components/staff/StaffMetric'

import { PriorityLink } from '@/features/student-tracking/components/PriorityLink'

export function ProgressIndicator({
  title,
  completed,
  total,
  percent,
  priority = false,
  returnTo,
}: {
  title: string
  completed: number
  total: number
  percent: number
  priority?: boolean
  returnTo?: string
}) {
  return (
    <StaffMetric
      label={title}
      primary={priority}
      value={total ? `${percent} %` : '—'}
      percent={total ? percent : undefined}
      detail={
        total
          ? `${completed} de ${total} actividades`
          : priority
            ? 'Aún no defines prioritarios'
            : 'Aún no hay actividades'
      }
    >
      {!total && priority && <PriorityLink returnTo={returnTo} />}
    </StaffMetric>
  )
}
