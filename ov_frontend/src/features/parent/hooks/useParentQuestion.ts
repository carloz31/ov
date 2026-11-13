import { useEffect, useRef, useState } from 'react'

import type { Actividad, IntentoPregunta, NodoPregunta } from '@/types/activities'
import {
  answerParentQuestion,
  evaluateParentQuestion,
  startParentActivity,
} from '@/features/parent/lib/missionLogic'
import { updateParentJourney } from '@/store/parentJourneyStore'
import { useParentActivities } from './useParentActivities'

type PracticeAttempt = Pick<IntentoPregunta, 'opcionIds' | 'correcta' | 'revelada' | 'numeroIntento'>
export function useParentQuestion({
  activity,
  node,
  review,
  practiceAttempts,
  onPracticeAnswer,
}: {
  activity: Actividad
  node: NodoPregunta
  review: boolean
  practiceAttempts: PracticeAttempt[]
  onPracticeAnswer: (selected: string[]) => void
}) {
  const { journey: state, accountId, available, serverCompletion } = useParentActivities()
  const opciones = { disponible: available(activity), servidor: serverCompletion }
  const attempts = review
    ? practiceAttempts
    : state.attempts.filter((attempt) => attempt.actividadId === activity.id && attempt.nodoId === node.id)
  const feedbackTitle = useRef<HTMLHeadingElement>(null)
  const last = attempts.at(-1)
  const [feedback, setFeedback] = useState(() =>
    last ? evaluateParentQuestion(node, last.opcionIds, attempts.length - 1) : undefined,
  )
  // Ajuste coherencia-apoderado: tras un error se puede marcar otra opción de inmediato; las equivocadas
  // salen de la selección (en opción múltiple quedan las correctas marcadas).
  const [selected, setSelected] = useState<string[]>(() =>
    last && feedback && !feedback.canContinue
      ? last.opcionIds.filter((id) => !feedback.wrongIds.includes(id))
      : (last?.opcionIds ?? []),
  )
  const wrongIds = new Set(
    attempts.flatMap((attempt) =>
      attempt.opcionIds.filter((id) => node.opciones.some((option) => option.id === id && !option.correcta)),
    ),
  )
  useEffect(() => {
    if (feedback) feedbackTitle.current?.focus()
  }, [feedback])
  function show(result: ReturnType<typeof evaluateParentQuestion>) {
    setFeedback(result)
    if (!result.canContinue) setSelected(selected.filter((id) => !result.wrongIds.includes(id)))
  }
  function check() {
    const result = evaluateParentQuestion(node, selected, attempts.length)
    if (review) {
      onPracticeAnswer(selected)
      show(result)
      return
    }
    let changed = false
    const saved = updateParentJourney((current) => {
      const next = answerParentQuestion(
        activity,
        node,
        selected,
        startParentActivity(activity, current, accountId, opciones),
        accountId,
        opciones,
      )
      changed = next !== current
      return next
    }, accountId)
    if (saved && changed) show(result)
  }
  return { feedbackTitle, selected, setSelected, feedback, wrongIds, attempted: attempts.length > 0, check }
}
