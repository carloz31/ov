import { Link } from 'react-router'
import { ClipboardList, Compass, HeartPulse } from 'lucide-react'

import { Button } from '@/components/ui/Button'

import { activities, profileCatalog } from '@/data/demo/studentProfiles'
import { usePriorityCatalog } from '@/features/counselor/hooks/usePrioritySettings'
import {
  displayDate,
  observationCounts,
  progress,
  signalSummary,
  securityLabel,
  questionnaireKey,
} from '@/features/student-tracking/lib/selectors'
import { profileUrl, questionnaireUrl } from '@/features/student-tracking/lib/navigation'
import { EmptyMessage } from '@/features/student-tracking/components/EmptyMessage'
import { Observations } from '@/features/student-tracking/components/Observations'
import { Panel } from '@/features/student-tracking/components/Panel'
import { QuestionnaireStatus } from '@/features/student-tracking/components/QuestionnaireStatus'
import { TrendValue } from '@/features/student-tracking/components/TrendValue'
import type { StudentProfile } from '@/types/studentProfile'
import { SummaryCard } from '@/features/student-tracking/components/SummaryCard'
import { PlatformProgress } from '@/features/student-tracking/components/PlatformProgress'
import { FamilySummary } from '@/features/student-tracking/components/FamilySummary'

export function SummarySection({ student, returnTo }: { student: StudentProfile; returnTo: string }) {
  const { questionnaires } = usePriorityCatalog()
  const priority = questionnaires.filter((q) => q.priority)
  const records = progress(
    student,
    activities.filter((a) => a.kind === 'record'),
  )
  const observations = observationCounts(student)
  const signals = signalSummary(student)
  const planA = student.plans.find((plan) => plan.slot === 'A')
  return (
    <div className="space-y-4">
      <Panel title="Cuestionarios">
        {!priority.length && <EmptyMessage>Aún no marcas cuestionarios como prioritarios.</EmptyMessage>}
        <ul className="divide-y">
          {priority.map((definition) => {
            const application = student.questionnaires.find((q) => q.questionnaireId === definition.id)!
            return (
              <li
                key={definition.id}
                className="flex flex-col items-start gap-3 py-3 first:pt-0 sm:flex-row sm:items-center"
              >
                <div className="min-w-0 flex-1 space-y-1">
                  <h3 className="font-semibold">{definition.name}</h3>
                  <QuestionnaireStatus application={application} />
                  {application.result &&
                    (application.result.kind !== 'comparison' || application.result.exit) && (
                      <p>{questionnaireKey(definition, application)}</p>
                    )}
                </div>
                {application.result && (
                  <Button variant="outline" className="min-h-11" asChild>
                    <Link to={questionnaireUrl(student.id, definition.id, returnTo)}>Ver resultado</Link>
                  </Button>
                )}
              </li>
            )
          })}
        </ul>
        <Button asChild variant="outline" className="mt-3 min-h-11 h-auto whitespace-normal">
          <Link to={profileUrl(student.id, returnTo, 'questionnaires')}>Ver todos los cuestionarios</Link>
        </Button>
      </Panel>
      <div className="grid items-start gap-4 xl:grid-cols-[minmax(0,7fr)_minmax(0,3fr)]">
        <div className="min-w-0 space-y-4">
          <FamilySummary student={student} />
          <PlatformProgress student={student} />
        </div>
        <div className="min-w-0 space-y-4">
          <SummaryCard
            title="Opciones"
            icon={Compass}
            to={profileUrl(student.id, returnTo, 'options')}
            action="Ver opciones"
          >
            <p>
              <strong className="text-2xl">{student.plans.length}</strong>{' '}
              <span className="text-sm text-muted-foreground">planes registrados</span>
            </p>
            <p className="text-sm font-medium">
              {planA
                ? `Plan A: ${profileCatalog.careers.find((c) => c.id === planA.careerId)?.name}`
                : 'Plan A sin registrar'}
            </p>
          </SummaryCard>
          <SummaryCard
            title="Registros"
            icon={ClipboardList}
            to={profileUrl(student.id, returnTo, 'records')}
            action="Ver registros"
          >
            <p>
              <strong className="text-2xl">{records.completed}</strong>{' '}
              <span className="text-sm text-muted-foreground">
                de {records.total} actividades completadas
              </span>
            </p>
            {observations.underdeveloped || observations.attention ? (
              <Observations {...observations} counts />
            ) : (
              <p className="text-sm text-muted-foreground">Sin respuestas observadas</p>
            )}
          </SummaryCard>
          <SummaryCard
            title="Seguridad y check-in"
            icon={HeartPulse}
            to={profileUrl(student.id, returnTo, 'security')}
            action="Ver seguridad y diario"
          >
            {signals.latest ? (
              <>
                <p>
                  <strong className="text-2xl">{signals.latest.security}</strong>{' '}
                  <span className="text-sm text-muted-foreground">
                    de 10 · {securityLabel(signals.latest.security!)}
                  </span>
                </p>
                <p className="text-sm text-muted-foreground">
                  Último check-in: {displayDate(signals.latest.date)}
                </p>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">Aún no registra check-ins de seguridad.</p>
            )}
            <TrendValue value={signals.securityTrend} />
          </SummaryCard>
        </div>
      </div>
    </div>
  )
}
