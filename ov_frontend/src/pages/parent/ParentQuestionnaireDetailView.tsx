import { useEffect, useRef } from 'react'
import { ArrowLeft } from 'lucide-react'
import { Link, useParams } from 'react-router'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { StaffEntityHeader } from '@/components/staff/StaffEntityHeader'
import { GuideDialogue } from '@/components/common/GuideDialogue'
import { parentGuides } from '@/data/content/guideTexts'
import { studentProfiles, questionnaires } from '@/data/demo/studentProfiles'
import { displayDate } from '@/features/student-tracking/lib/selectors'
import { QuestionnaireDetailContent } from '@/features/student-tracking/components/QuestionnaireDetailContent'
import { usePrioritySettings } from '@/features/counselor/hooks/usePrioritySettings'
import { parentChildren } from '@/features/parent/data/parentPortal'
import { useParentPortalContext } from '@/features/parent/context/parentPortalContext'
import { useResultadosHijo } from '@/features/parent/hooks/useResultadosHijo'
import { inicialesHijo, resultadoDeInstrumento } from '@/features/parent/lib/familia'
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
  const { completedActivityIds, activities, available, familia } = useParentPortalContext()
  const child = parentChildren.find((item) => item.id === childId)
  const student = child && studentProfiles.find((item) => item.id === child.id)
  const definition = questionnaires.find(
    (item) => item.id === questionnaireId && familySharedIds(settings).includes(item.id),
  )
  const route = parentRoute(activities, parentChildren, completedActivityIds, available)
  const application = student?.questionnaires.find((item) => item.questionnaireId === definition?.id)
  // Ajuste inicio-apoderado: en api, el hijo es el de la URL entre los vinculados.
  const hijoServidor = familia?.estudiantes.find((e) => e.codigo === childId) ?? null
  const back = parentHomeUrl(familia ? (hijoServidor?.codigo ?? '') : (child?.id ?? parentChildren[0]?.id ?? ''))
  // F03: en api, con el diploma, el resultado del hijo sale del servidor (de partida y llegada, el de llegada
  // si existe).
  const resultadosHijo = useResultadosHijo(familia, hijoServidor?.codigo)
  const resultadoServidor = resultadoDeInstrumento(resultadosHijo.resultados, questionnaireId)
  if (hijoServidor && resultadosHijo.habilitado && (!resultadosHijo.resultados || resultadoServidor))
    return (
      <main ref={mainRef} className="min-w-0 space-y-6 break-words p-4 sm:p-6 lg:p-8" aria-busy={!resultadoServidor}>
        <Button asChild variant="link" className="min-h-11 px-0">
          <Link to={back}>
            <ArrowLeft aria-hidden />
            Volver
          </Link>
        </Button>
        {resultadosHijo.error && (
          <div role="alert" className="space-y-3">
            <p>{resultadosHijo.error}</p>
            <Button variant="outline" className="min-h-11" onClick={resultadosHijo.reintentar}>
              Reintentar
            </Button>
          </div>
        )}
        {resultadoServidor && (
          <>
            <StaffEntityHeader
              title={resultadoServidor.nombre}
              initials={inicialesHijo(hijoServidor.nombre)}
              details={<p>{hijoServidor.nombre}</p>}
            />
            <QuestionnaireDetailContent servidor={resultadoServidor} nombre={hijoServidor.nombre} />
          </>
        )}
        <GuideDialogue audience="parent" text={parentGuides.questionnaire} />
      </main>
    )
  // En api, sin diploma, el detalle solo muestra el aviso, con el nombre real del hijo.
  const hijo = familia ? hijoServidor?.nombre : student?.nombres
  if (
    familia ||
    !child ||
    !student ||
    !definition ||
    !route.complete ||
    !completeFamilyResult(application)
  ) {
    // F03: con el diploma, un cuestionario que el servidor no entrega ya no espera actividades.
    const locked = familia
      ? !!hijoServidor && !familia.diploma.obtenido
      : !!(child && definition && !route.complete)
    return (
      <main className="space-y-5 p-5 sm:p-8">
        <h1 className="text-2xl font-bold">
          {locked ? 'Completa tus actividades' : 'Resultado no disponible'}
        </h1>
        <p className="text-muted-foreground">
          {locked
            ? `Podrás ver los resultados de ${hijo} cuando completes tus actividades.`
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
        <GuideDialogue audience="parent" text={parentGuides.questionnaire} />
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
      <GuideDialogue audience="parent" text={parentGuides.questionnaire} />
    </main>
  )
}
