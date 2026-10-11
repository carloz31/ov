import type { JourneyState } from '@/types/activities'
export type { JourneyState } from '@/types/activities'
import type {
  Actividad,
  Entregable,
  Instrumento,
  NodoConsigna,
  NodoPregunta,
  ResultadoInstrumento,
} from '@/types/activities'
export const studentId = 'est-prototipo'
export function initialJourney(): JourneyState {
  return {
    version: 2,
    progress: {},
    items: [],
    choices: [],
    attempts: [],
    submissions: [],
    results: [],
    rewards: [],
    pieces: [],
    resources: [],
    drafts: {},
  }
}
export function latestSubmission(state: JourneyState, activityId: string, nodeId: string) {
  return state.submissions
    .filter((entry) => entry.actividadId === activityId && entry.nodoId === nodeId)
    .at(-1)
}
export function validateSubmission(node: NodoConsigna, content: Entregable['contenido']): string | undefined {
  const spec = node.entregable
  if (spec.tipo !== content.tipo) return 'El formato de la entrega no corresponde.'
  if (spec.tipo === 'texto' && content.tipo === 'texto') {
    const count = content.texto.trim().length
    if (count < (spec.minCaracteres ?? 1)) return `Escribe al menos ${spec.minCaracteres ?? 1} caracteres.`
    if (count > (spec.maxCaracteres ?? Infinity)) return `Usa como máximo ${spec.maxCaracteres} caracteres.`
  }
  if (spec.tipo === 'archivo' && content.tipo === 'archivo') {
    if (!content.archivos.length || content.archivos.length > spec.maxArchivos)
      return `Adjunta entre 1 y ${spec.maxArchivos} archivos.`
    if (
      content.archivos.some(
        (file) =>
          file.tamanoBytes > spec.maxMB * 1024 * 1024 ||
          !spec.formatos.some((format) =>
            file.nombre.toLowerCase().endsWith(`.${format.replace(/^\./, '').toLowerCase()}`),
          ),
      )
    )
      return `Usa ${spec.formatos.join(', ')} de hasta ${spec.maxMB} MB por archivo.`
  }
  if (
    spec.tipo === 'opcion' &&
    content.tipo === 'opcion' &&
    (!content.seleccion.length ||
      (!spec.multiple && content.seleccion.length !== 1) ||
      content.seleccion.some((value) => !spec.opciones.includes(value)))
  )
    return 'Selecciona una opción válida.'
}
export function isActivityComplete(activity: Actividad, state: JourneyState) {
  if (activity.tipo === 'instrumento') {
    const items = activity.nodos.filter((node) => node.tipo === 'item')
    return items.length > 0
      ? items.every((node) =>
          state.items.some(
            (answer) =>
              answer.instrumentoId === node.instrumentoId &&
              answer.itemId === node.itemId &&
              answer.aplicacion === 'unica',
          ),
        )
      : activity.nodos.some(
          (node) =>
            node.tipo === 'resultado' &&
            state.results.some((result) => result.instrumentoId === node.instrumentoId),
        )
  }
  const required = activity.nodos.filter((node) => node.tipo === 'consigna' && node.obligatoria)
  if (required.length === 0) {
    return (
      state.progress[activity.id]?.nodoActualId === '$fin' &&
      activity.nodos
        .filter((node) => node.tipo === 'pregunta' && node.bloqueante)
        .every((node) =>
          state.attempts.some(
            (attempt) =>
              attempt.actividadId === activity.id &&
              attempt.nodoId === node.id &&
              (attempt.correcta || attempt.revelada),
          ),
        )
    )
  }
  const template = activity.plantilla?.tipo === 'matriz' ? activity.plantilla : undefined
  const alternative = template?.alternativa
  const file = alternative && latestSubmission(state, activity.id, alternative.nodoId)
  const replaced =
    alternative?.reemplazaSlots && file?.contenido.tipo === 'archivo' && file.contenido.archivos.length > 0
  return (
    required.length > 0 &&
    required.every((node) => {
      if (node.tipo !== 'consigna') return false
      if (node.slot && replaced) return true
      const entry = latestSubmission(state, activity.id, node.id)
      return entry && !validateSubmission(node, entry.contenido)
    })
  )
}
export function applyCompletion(
  activity: Actividad,
  state: JourneyState,
  participantId = studentId,
  completionCheck = isActivityComplete,
): JourneyState {
  if (!completionCheck(activity, state) || state.progress[activity.id]?.estado === 'completada') return state
  const date = new Date().toISOString()
  return {
    ...state,
    progress: {
      ...state.progress,
      [activity.id]: {
        ...state.progress[activity.id],
        estudianteId: participantId,
        actividadId: activity.id,
        estado: 'completada',
        completadaEn: date,
      },
    },
    rewards:
      activity.audiencia === 'apoderado'
        ? state.rewards
        : state.rewards.some((row) => row.actividadId === activity.id)
          ? state.rewards
          : [
              ...state.rewards,
              { actividadId: activity.id, cantidad: activity.recompensa?.afinidad ?? 0, fecha: date },
            ],
    pieces: [
      ...new Set([
        ...state.pieces,
        ...(activity.audiencia !== 'apoderado' && activity.recompensa?.piezaLlave
          ? [activity.recompensa.piezaLlave]
          : []),
      ]),
    ],
    resources: [...new Set([...state.resources, ...(activity.recompensa?.recursoIds ?? [])])],
  }
}
export function evaluateQuestion(node: NodoPregunta, selected: string[], previousFailures: number) {
  const correct = node.opciones.filter((option) => option.correcta).map((option) => option.id)
  const exact = selected.length === correct.length && correct.every((id) => selected.includes(id))
  const revealed =
    !exact && previousFailures >= node.pistas.length && node.alAgotarPistas === 'revelar_y_continuar'
  return {
    correct: exact,
    revealed,
    canContinue: exact || revealed || !node.bloqueante,
    hint: !exact && !revealed ? node.pistas[previousFailures] : undefined,
  }
}
export function visibleNodes(activity: Actividad, direct: boolean) {
  return direct && activity.tipo === 'instrumento'
    ? activity.nodos.filter((node) => node.tipo === 'item' || node.tipo === 'resultado')
    : activity.nodos
}
export function nextPendingNode(activity: Actividad, state: JourneyState, direct: boolean) {
  const nodes = visibleNodes(activity, direct)
  const saved = state.progress[activity.id]?.nodoActualId
  // Older encounters could finish their written application before reaching the end.
  // Keep completed runs, but resume pending runs at an unanswered blocking question.
  if (activity.tipo === 'encuentro' && state.progress[activity.id]?.estado !== 'completada') {
    const savedIndex = saved === '$fin' ? nodes.length : nodes.findIndex((node) => node.id === saved)
    const pending = nodes.find(
      (node, index) =>
        index <= savedIndex &&
        node.tipo === 'pregunta' &&
        node.bloqueante &&
        !state.attempts.some(
          (attempt) =>
            attempt.actividadId === activity.id &&
            attempt.nodoId === node.id &&
            (attempt.correcta || attempt.revelada),
        ),
    )
    if (pending) return pending
  }
  if (saved === '$fin') return undefined
  let index = Math.max(
    0,
    nodes.findIndex((node) => node.id === saved),
  )
  while (index < nodes.length) {
    const node = nodes[index]
    if (
      node.tipo !== 'item' ||
      !state.items.some(
        (answer) =>
          answer.instrumentoId === node.instrumentoId &&
          answer.itemId === node.itemId &&
          answer.aplicacion === 'unica',
      )
    )
      return node
    index++
  }
}
export function calculateResult(
  instrument: Instrumento,
  state: JourneyState,
  requiredIds: string[],
): ResultadoInstrumento | undefined {
  if (!requiredIds.length || !requiredIds.every((id) => state.progress[id]?.estado === 'completada')) return
  if (
    !instrument.clave.dimensiones.length ||
    instrument.clave.dimensiones.some((dim) => dim.id.includes('[') || dim.nombre.includes('[')) ||
    instrument.items.some((item) => item.codigo.includes('[')) ||
    !instrument.clave.asignacion.length
  )
    return
  if (
    !instrument.items.every((item) =>
      state.items.some(
        (answer) =>
          answer.itemId === item.id &&
          answer.instrumentoId === instrument.id &&
          answer.aplicacion === 'unica',
      ),
    )
  )
    return
  return {
    estudianteId: studentId,
    instrumentoId: instrument.id,
    aplicacion: 'unica',
    versionClave: instrument.version,
    calculadoEn: new Date().toISOString(),
    puntajes: instrument.clave.dimensiones.map((dim) => ({
      dimensionId: dim.id,
      puntaje: instrument.clave.asignacion.filter(
        (key) =>
          key.dimensionId === dim.id &&
          state.items.some(
            (answer) =>
              answer.instrumentoId === instrument.id &&
              answer.itemId === key.itemId &&
              answer.aplicacion === 'unica' &&
              answer.valor === key.valorQueSuma,
          ),
      ).length,
    })),
  }
}
