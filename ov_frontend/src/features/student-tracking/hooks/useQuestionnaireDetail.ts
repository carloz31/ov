import { useEffect, useRef } from 'react'

import { useParams, useSearchParams } from 'react-router'

import { questionnaires, studentProfiles } from '@/data/demo/studentProfiles'

import { safeReturnTo } from '@/features/student-tracking/lib/navigation'

export function useQuestionnaireDetail() {
  const { studentId, questionnaireId } = useParams()
  const mainRef = useRef<HTMLElement>(null)
  useEffect(() => {
    mainRef.current?.scrollIntoView({ block: 'start' })
  }, [studentId, questionnaireId])
  const [params] = useSearchParams()
  const returnTo = safeReturnTo(params.get('returnTo'))
  const student = studentProfiles.find((s) => s.id === studentId)
  const definition = questionnaires.find((q) => q.id === questionnaireId)
  const application = student?.questionnaires.find((q) => q.questionnaireId === questionnaireId)
  return { mainRef, returnTo, student, definition, application }
}
