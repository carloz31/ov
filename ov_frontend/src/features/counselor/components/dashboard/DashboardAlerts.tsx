import { useCounselorDashboard } from '@/features/counselor/hooks/useCounselorDashboard'
import { Link } from 'react-router'
import { Button } from '@/components/ui/Button'

import { AlertBadge } from '@/components/ui/Status'

import { profileAlertLabels } from '@/features/student-tracking/lib/selectors'

import { Section } from '@/features/counselor/components/Section'

export function DashboardAlerts({ model }: { model: ReturnType<typeof useCounselorDashboard> }) {
  const { summary, listUrl, ratio } = model
  return (
    <Section title="Alertas">
      <p className="text-sm">
        <strong>
          {summary.withAlerts} de {summary.total}
        </strong>{' '}
        con al menos una alerta
      </p>
      <div className="space-y-5">
        {summary.alerts.map((row) => (
          <div
            key={row.code}
            className="relative flex min-h-10 items-center justify-between gap-3 rounded-md px-2 text-sm"
          >
            <span
              className="absolute inset-y-1 left-0 rounded bg-primary-soft"
              style={{ width: `${ratio(row.count)}%` }}
              aria-hidden
            />
            <AlertBadge className="relative text-xs">{profileAlertLabels[row.code]}</AlertBadge>
            <span className="relative shrink-0">
              {row.count} · {Math.round(ratio(row.count))} %
            </span>
          </div>
        ))}
      </div>
      {!summary.alerts.length && (
        <p className="text-sm text-muted-foreground">
          {summary.total
            ? 'Ningún estudiante del salón tiene alertas.'
            : 'Todavía no hay estudiantes en este salón.'}
        </p>
      )}
      <p className="text-xs text-muted-foreground">Un estudiante puede presentar varias alertas.</p>
      <Button asChild variant="outline" className="mt-auto min-h-11 self-start whitespace-normal">
        <Link to={`${listUrl}&alertas=with`}>Ver estudiantes con alertas</Link>
      </Button>
    </Section>
  )
}
