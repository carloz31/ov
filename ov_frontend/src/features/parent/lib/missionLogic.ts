import { applyCompletion } from '@/lib/activities/logic'
import type { JourneyState } from '@/types/activities'
import type { Actividad, NodoPregunta } from '@/types/activities'

type ParentActivityOptions = { disponible?: boolean; servidor?: boolean }

export function evaluateParentQuestion(node: NodoPregunta, selected: string[], previousAttempts: number) {
  const correctOptions = node.opciones.filter((option) => option.correcta)
  const correct =
    selected.length === correctOptions.length &&
    correctOptions.every((option) => selected.includes(option.id))
  const wrongOptions = node.opciones.filter((option) => !option.correcta && selected.includes(option.id))
  const final = correct || node.opciones.length === 2 || previousAttempts >= 1
  const answers = correctOptions.map((option) => `«${option.texto}»`).join(' y ')
  const plural = correctOptions.length > 1
  const someCorrect = correctOptions.some((option) => selected.includes(option.id))
  const title = final
    ? correct
      ? `¡Bien! ${plural ? 'Las respuestas son' : 'La respuesta es'} ${answers}.`
      : `Casi. ${plural ? 'Las respuestas más adecuadas son' : 'La respuesta más adecuada es'} ${answers}.`
    : node.formato === 'opcion_multiple' && someCorrect
      ? wrongOptions.length
        ? 'Va por buen camino. Algunas de sus opciones no corresponden y quedaron marcadas en naranja. Revise si falta alguna.'
        : 'Va por buen camino, pero falta al menos una opción.'
      : 'Casi. Piénselo una vez más.'
  return {
    correct,
    revealed: !correct && final,
    canContinue: final,
    title,
    wrongIds: wrongOptions.map((option) => option.id),
    explanations: (final ? correctOptions : wrongOptions).map(
      (option) => option.retroalimentacion || node.explicacion,
    ),
  }
}

export function parentQuestionResolved(node: NodoPregunta, state: JourneyState, activityId: string) {
  const attempts = state.attempts.filter(
    (attempt) => attempt.actividadId === activityId && attempt.nodoId === node.id,
  )
  return (
    attempts.some((attempt) => attempt.correcta || attempt.revelada) ||
    !!(
      attempts.length &&
      evaluateParentQuestion(node, attempts.at(-1)!.opcionIds, attempts.length - 1).canContinue
    )
  )
}
export function isParentActivityComplete(activity: Actividad, state: JourneyState) {
  return (
    activity.audiencia === 'apoderado' &&
    state.progress[activity.id]?.nodoActualId === '$fin' &&
    activity.nodos.every(
      (node) =>
        node.tipo !== 'pregunta' || !node.bloqueante || parentQuestionResolved(node, state, activity.id),
    )
  )
}
export function readyToCompleteOnServer(activity: Actividad, state: JourneyState) {
  return isParentActivityComplete(activity, {
    ...state,
    progress: {
      ...state.progress,
      [activity.id]: { ...state.progress[activity.id], nodoActualId: '$fin' },
    },
  })
}
export function nextParentPendingNode(activity: Actividad, state: JourneyState) {
  const progress = state.progress[activity.id]
  if (progress?.estado === 'completada') return undefined
  const index =
    progress?.nodoActualId === '$fin'
      ? activity.nodos.length
      : activity.nodos.findIndex((node) => node.id === progress?.nodoActualId)
  const pending = activity.nodos.find(
    (node, position) =>
      position <= index &&
      node.tipo === 'pregunta' &&
      node.bloqueante &&
      !parentQuestionResolved(node, state, activity.id),
  )
  return pending ?? (index < 0 ? activity.nodos[0] : activity.nodos[index])
}

export function parentActivityAvailable(activity: Actividad, state: JourneyState) {
  return (
    activity.audiencia === 'apoderado' &&
    activity.requisitos.every((id) => state.progress[id]?.estado === 'completada')
  )
}
export function completedParentActivities(activities: Actividad[], state: JourneyState) {
  return activities
    .filter(
      (activity) =>
        state.progress[activity.id]?.estado === 'completada' && isParentActivityComplete(activity, state),
    )
    .map((activity) => activity.id)
}
export function startParentActivity(
  activity: Actividad,
  state: JourneyState,
  accountId: string,
  opciones?: ParentActivityOptions,
): JourneyState {
  const progress = state.progress[activity.id]
  if (
    !(opciones?.disponible ?? parentActivityAvailable(activity, state)) ||
    (progress && (!opciones?.servidor || progress.nodoActualId || progress.estado !== 'no_iniciada'))
  )
    return state
  return {
    ...state,
    progress: {
      ...state.progress,
      [activity.id]: {
        ...progress,
        estudianteId: accountId,
        actividadId: activity.id,
        estado: 'en_curso',
        iniciadaEn: new Date().toISOString(),
        nodoActualId: activity.nodos[0]?.id ?? '$fin',
      },
    },
  }
}
export function answerParentQuestion(
  activity: Actividad,
  node: NodoPregunta,
  selected: string[],
  state: JourneyState,
  accountId: string,
  opciones?: ParentActivityOptions,
): JourneyState {
  if (
    !(opciones?.disponible ?? parentActivityAvailable(activity, state)) ||
    !selected.length ||
    new Set(selected).size !== selected.length ||
    selected.some((id) => !node.opciones.some((option) => option.id === id)) ||
    (node.formato !== 'opcion_multiple' && selected.length !== 1)
  )
    return state
  const prior = state.attempts.filter(
    (attempt) => attempt.actividadId === activity.id && attempt.nodoId === node.id,
  )
  if (
    state.progress[activity.id]?.estado === 'completada' ||
    prior.length >= (node.opciones.length === 2 ? 1 : 2) ||
    parentQuestionResolved(node, state, activity.id) ||
    prior.some((attempt) =>
      attempt.opcionIds.some(
        (id) => selected.includes(id) && node.opciones.some((option) => option.id === id && !option.correcta),
      ),
    )
  )
    return state
  const result = evaluateParentQuestion(node, selected, prior.length)
  return {
    ...state,
    attempts: [
      ...state.attempts,
      {
        estudianteId: accountId,
        actividadId: activity.id,
        nodoId: node.id,
        opcionIds: selected,
        correcta: result.correct,
        revelada: result.revealed,
        numeroIntento: prior.length + 1,
        respondidaEn: new Date().toISOString(),
      },
    ],
  }
}
export function retreatParentActivity(
  activity: Actividad,
  nodeId: string,
  state: JourneyState,
  opciones?: ParentActivityOptions,
): JourneyState {
  if (!(opciones?.disponible ?? parentActivityAvailable(activity, state))) return state
  const index =
    nodeId === '$fin' ? activity.nodos.length : activity.nodos.findIndex((node) => node.id === nodeId)
  const progress = state.progress[activity.id]
  if (index <= 0 || !progress || progress.estado === 'completada' || progress.nodoActualId !== nodeId)
    return state
  return {
    ...state,
    progress: {
      ...state.progress,
      [activity.id]: { ...progress, nodoActualId: activity.nodos[index - 1].id },
    },
  }
}

export function advanceParentActivity(
  activity: Actividad,
  nodeId: string,
  state: JourneyState,
  accountId: string,
  optionId?: string,
  opciones?: ParentActivityOptions,
): JourneyState {
  if (!(opciones?.disponible ?? parentActivityAvailable(activity, state))) return state
  const index = activity.nodos.findIndex((node) => node.id === nodeId)
  const node = activity.nodos[index]
  if (!node) return state
  const completed = state.progress[activity.id]?.estado === 'completada'
  if (!completed && state.progress[activity.id]?.nodoActualId !== nodeId) return state
  if (node.tipo === 'pregunta' && node.bloqueante && !parentQuestionResolved(node, state, activity.id))
    return state
  const option = node.tipo === 'eleccion' ? node.opciones.find((option) => option.id === optionId) : undefined
  if (node.tipo === 'eleccion' && !option) return state
  const next = {
    ...state,
    choices:
      node.tipo === 'eleccion' && node.registrar && option
        ? [
            ...state.choices,
            {
              estudianteId: accountId,
              actividadId: activity.id,
              nodoId: node.id,
              opcionId: option.id,
              respondidaEn: new Date().toISOString(),
            },
          ]
        : state.choices,
    progress: completed
      ? state.progress
      : {
          ...state.progress,
          [activity.id]: {
            ...state.progress[activity.id],
            estudianteId: accountId,
            actividadId: activity.id,
            estado: 'en_curso' as const,
            nodoActualId: activity.nodos[index + 1]?.id ?? '$fin',
          },
        },
  }
  return opciones?.servidor ? next : applyCompletion(activity, next, accountId, isParentActivityComplete)
}
