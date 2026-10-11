import { displayDate, questionnaireState } from '@/features/student-tracking/lib/selectors'
import type { QuestionnaireApplication } from '@/types/studentProfile'
import { ActivityStatus } from '@/features/student-tracking/components/ActivityStatus'

export function QuestionnaireStatus({ application }: { application: QuestionnaireApplication }) {
  if (application.result?.kind === 'comparison') {
    return (
      <span className="flex flex-wrap items-center gap-2">
        <ActivityStatus state="completed" label="Entrada completada" />
        <ActivityStatus
          state={application.result.exit ? 'completed' : 'not-started'}
          label={
            application.result.exit
              ? `Salida completada · ${displayDate(application.result.exitDate)}`
              : 'Salida pendiente'
          }
        />
      </span>
    )
  }
  return <ActivityStatus state={application.state} label={questionnaireState(application)} />
}
