import { useEffect, useRef } from 'react'
import { ArrowLeft } from 'lucide-react'
import { Link, useParams } from 'react-router'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { StaffEntityHeader } from '@/components/staff/StaffEntityHeader'
import { studentProfiles, questionnaires } from '@/data/demo/studentProfiles'
import { displayDate } from '@/features/student-tracking/lib/selectors'
import { QuestionnaireDetailContent } from '@/features/student-tracking/components/QuestionnaireDetailContent'
import { usePrioritySettings } from '@/features/counselor/hooks/usePrioritySettings'
import { parentChildren } from '@/features/parent/data/parentPortal'
import { useParentPortalContext } from '@/features/parent/context/parentPortalContext'
import {
  completeFamilyResult,
  familySharedIds,
  parentHomeUrl,
  parentRoute,
} from '@/features/parent/lib/selectors'

export function ParentQuestionnaireDetailView() {
  const { childId, questionnaireId } = useParams()
  const mainRef = useRef<HTMLElement>(null)
  useEffect(() => {
    mainRef.current?.scrollIntoView({ block: 'start' })
  }, [childId, questionnaireId])
  const settings = usePrioritySettings()
  const { completedActivityIds, activities, available } = useParentPortalContext()
  const child = parentChildren.find((item) => item.id === childId)
  const student = child && studentProfiles.find((item) => item.id === child.id)
  const definition = questionnaires.find(
    (item) => item.id === questionnaireId && familySharedIds(settings).includes(item.id),
  )
  const route = parentRoute(activities, parentChildren, completedActivityIds, available)
  const application = student?.questionnaires.find((item) => item.questionnaireId === definition?.id)
  const back = parentHomeUrl(child?.id ?? parentChildren[0]?.id ?? '')
  if (!child || !student || !definition || !route.complete || !completeFamilyResult(application)) {
    const locked = !!(child && definition && !route.complete)
    return (
      <main className="space-y-5 p-5 sm:p-8">
        <h1 className="text-2xl font-bold">
          {locked ? 'Completa tus actividades' : 'Resultado no disponible'}
        </h1>
        <p className="text-muted-foreground">
          {locked
            ? `Podrás ver los resultados de ${student?.nombres} cuando completes tus actividades.`
            : 'Este resultado no está disponible para esta cuenta.'}
        </p>
        {locked && (
          <Button asChild className="min-h-11">
            <Link to="/parent/activities">Ir a mis actividades</Link>
          </Button>
        )}
        <Button asChild variant="outline" className="min-h-11">
          <Link to={back}>Volver a Inicio</Link>
        </Button>
      </main>
    )
  }
  return (
    <main ref={mainRef} className="min-w-0 space-y-6 break-words p-4 sm:p-6 lg:p-8">
      <Button asChild variant="link" className="min-h-11 px-0">
        <Link to={back}>
          <ArrowLeft aria-hidden />
          Volver
        </Link>
      </Button>
      <StaffEntityHeader
        title={definition.name}
        initials={child.initials}
        details={<p>{child.name}</p>}
        metrics={<Badge variant="success">Completado · {displayDate(application?.completedAt)}</Badge>}
      />
      <QuestionnaireDetailContent
        student={student}
        definition={definition}
        result={application?.result}
        audience="parent"
      />
    </main>
  )
}
