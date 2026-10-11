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
  const answerOptions = useRef<HTMLFieldSetElement>(null)
  const last = attempts.at(-1)
  const [selected, setSelected] = useState<string[]>(last?.opcionIds ?? [])
  const [retrying, setRetrying] = useState(false)
  const [feedback, setFeedback] = useState(() =>
    last ? evaluateParentQuestion(node, last.opcionIds, attempts.length - 1) : undefined,
  )
  const wrongIds = new Set(
    attempts.flatMap((attempt) =>
      attempt.opcionIds.filter((id) => node.opciones.some((option) => option.id === id && !option.correcta)),
    ),
  )
  useEffect(() => {
    if (feedback && !retrying) feedbackTitle.current?.focus()
    else if (retrying) answerOptions.current?.focus()
  }, [feedback, retrying])
  function check() {
    const result = evaluateParentQuestion(node, selected, attempts.length)
    if (review) {
      onPracticeAnswer(selected)
      setFeedback(result)
      setRetrying(false)
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
    if (saved && changed) {
      setFeedback(result)
      setRetrying(false)
    }
  }
  function retry() {
    setSelected(selected.filter((id) => !wrongIds.has(id)))
    setRetrying(true)
  }
  return { feedbackTitle, answerOptions, selected, setSelected, retrying, feedback, wrongIds, check, retry }
}
