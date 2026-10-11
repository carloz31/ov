import { useCounselorDashboard } from '@/features/counselor/hooks/useCounselorDashboard'

import { AlertBadge } from '@/components/ui/Status'

import { StateBar } from '@/features/counselor/components/StateBar'
import { StateCounts } from '@/features/counselor/components/StateCounts'
import { StateLegend } from '@/features/counselor/components/StateLegend'
import { Section } from '@/features/counselor/components/Section'
import { ConfigurePriorities } from '@/features/counselor/components/ConfigurePriorities'

export function DashboardRecords({ model }: { model: ReturnType<typeof useCounselorDashboard> }) {
  const { summary, recordRows } = model
  return (
    <Section title="Actividades de registro">
      {recordRows.length ? (
        <>
          <StateLegend />
          <div className="space-y-5">
            {recordRows.slice(0, 4).map((row) => (
              <div key={row.activity.id} className="space-y-2">
                <div className="flex items-start justify-between gap-3 text-sm">
                  <h3 className="font-semibold">{row.activity.title}</h3>
                  <StateCounts completed={row.completed} progress={row.progress} pending={row.pending} />
                </div>
                <StateBar completed={row.completed} progress={row.progress} pending={row.pending} />
              </div>
            ))}
          </div>
          {recordRows.length > 4 && (
            <p className="text-xs text-muted-foreground">
              y {recordRows.length - 4} actividades más en el perfil de cada estudiante
            </p>
          )}
          <div className="mt-auto space-y-3 border-t pt-4 text-sm">
            <p>
              Respuestas poco desarrolladas: <strong>{summary.recordObservations.underdeveloped}</strong>
            </p>
            <AlertBadge critical={summary.recordObservations.attention > 0} className="text-xs">
              Requiere atención: {summary.recordObservations.attention} estudiantes
            </AlertBadge>
          </div>
        </>
      ) : (
        <>
          <p className="text-sm text-muted-foreground">
            Sin actividades de registro prioritarias configuradas.
          </p>
          <ConfigurePriorities />
        </>
      )}
    </Section>
  )
}
