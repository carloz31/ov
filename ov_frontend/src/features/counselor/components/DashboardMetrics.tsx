import { useCounselorDashboard } from '@/features/counselor/hooks/useCounselorDashboard'
import { BookOpenCheck, Gauge, NotebookPen, Users } from 'lucide-react'

import { ClassroomMetric } from '@/features/counselor/components/ClassroomMetric'

export function DashboardMetrics({ model }: { model: ReturnType<typeof useCounselorDashboard> }) {
  const { summary, ratio } = model
  return (
    <div className="grid min-w-0 gap-4 sm:grid-cols-2 2xl:grid-cols-4">
      <ClassroomMetric
        icon={Gauge}
        primary
        label="Avance prioritario promedio"
        value={
          summary.average === null
            ? summary.priorityActivityCount
              ? 'Sin datos'
              : 'Sin prioritarios'
            : `${Math.round(summary.average)} %`
        }
        percent={summary.average}
      />
      <ClassroomMetric
        icon={BookOpenCheck}
        label="Estudiantes con cuestionarios completos"
        value={
          summary.questionnaireComplete === null
            ? 'Sin prioritarios'
            : `${summary.questionnaireComplete} de ${summary.total}`
        }
        note="Todos los prioritarios"
        percent={summary.questionnaireComplete === null ? null : ratio(summary.questionnaireComplete)}
      />
      <ClassroomMetric
        icon={NotebookPen}
        label="Con planes"
        value={`${summary.withPlans} de ${summary.total}`}
        note={`${summary.plans.three} con sus tres planes`}
        percent={ratio(summary.withPlans)}
      />
      <ClassroomMetric
        icon={Users}
        label="Apoderados registrados"
        value={`${summary.family.registered} de ${summary.total}`}
        note={`${summary.family.completed} completaron su ruta`}
        percent={ratio(summary.family.registered)}
      />
    </div>
  )
}
