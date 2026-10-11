import { Progress } from '@/components/ui/Progress'

import { ActivityStatus } from '@/features/student-tracking/components/ActivityStatus'

export function CompactProgress({
  title,
  completed,
  total,
  unavailable = false,
  unit = 'actividades',
}: {
  title: string
  completed: number
  total: number
  unavailable?: boolean
  unit?: string
}) {
  const percent = total ? Math.round((completed / total) * 100) : 0
  return (
    <section className="min-w-0 space-y-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-sm font-medium">{title}</h3>
        {unavailable ? (
          <ActivityStatus state="unavailable" />
        ) : (
          <ActivityStatus
            state={total && completed === total ? 'completed' : completed ? 'in-progress' : 'not-started'}
            label={`${percent} %`}
          />
        )}
      </div>
      <Progress aria-label={title} value={percent} />
      <p className="text-sm text-muted-foreground">
        {completed} de {total} {unit}
      </p>
    </section>
  )
}
