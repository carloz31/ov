import { useQuestionnaireDetail } from '@/features/student-tracking/hooks/useQuestionnaireDetail'

import { ArrowLeft } from 'lucide-react'
import { StaffEntityHeader } from '@/components/staff/StaffEntityHeader'
import { Link } from 'react-router'
import { Button } from '@/components/ui/Button'

import { displayDate, fullName } from '@/features/student-tracking/lib/selectors'
import { profileUrl } from '@/features/student-tracking/lib/navigation'
import { QuestionnaireStatus } from '@/features/student-tracking/components/QuestionnaireStatus'
import { QuestionnaireDetailContent } from '@/features/student-tracking/components/QuestionnaireDetailContent'

export function QuestionnaireDetailView() {
  const { mainRef, returnTo, student, definition, application } = useQuestionnaireDetail()
  if (!student || !definition || !application)
    return (
      <main className="p-5">
        <h1 className="text-2xl font-bold">
          {!student ? 'Estudiante no encontrado' : 'Cuestionario no encontrado'}
        </h1>
        <Button asChild variant="outline" className="mt-4 min-h-11">
          <Link to={student ? profileUrl(student.id, returnTo, 'questionnaires') : returnTo}>
            {student ? 'Volver al perfil' : 'Volver a Mis estudiantes'}
          </Link>
        </Button>
      </main>
    )
  const result = application.result
  return (
    <main
      ref={mainRef}
      className="min-w-0 space-y-4 px-5 py-4 text-base break-words sm:px-8 sm:py-6 lg:px-10 lg:py-8"
    >
      <Button asChild variant="link" className="min-h-11 px-0">
        <Link to={profileUrl(student.id, returnTo, 'questionnaires')}>
          <ArrowLeft aria-hidden />
          Volver al perfil
        </Link>
      </Button>
      <StaffEntityHeader
        title={definition.name}
        initials="CT"
        details={<p>{fullName(student)}</p>}
        metrics={<QuestionnaireStatus application={application} />}
      >
        {result?.kind === 'comparison' ? (
          <>
            <p className="text-muted-foreground">Entrada: {displayDate(result.entryDate)}</p>
            <p className="text-muted-foreground">
              {result.exit ? `Salida: ${displayDate(result.exitDate)}` : 'Cuestionario de salida pendiente'}
            </p>
          </>
        ) : null}
      </StaffEntityHeader>
      <QuestionnaireDetailContent student={student} definition={definition} result={result} />
    </main>
  )
}
