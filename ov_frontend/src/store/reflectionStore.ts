import { useSyncExternalStore } from 'react'
import type { ReflectionState, RegistryResponse, Evaluation } from '@/types/reflection'
import { additionalMissions } from '@/data/activities/reflectionConfig'

const storageKey = 'ov.student-reflections.v1'
const object = (value: unknown) => !!value && typeof value === 'object' && !Array.isArray(value)
const strings = (value: unknown) => Array.isArray(value) && value.every((item) => typeof item === 'string')
export const initialReflectionState = (): ReflectionState => ({
  version: 1,
  respuestas: {},
  evaluaciones: [],
  preguntas: {},
  eventos: [],
  desbloqueos: [],
  introVista: false,
  primeraAdicionalVista: false,
  escenarios: {},
})
function read(): ReflectionState {
  try {
    const value = JSON.parse(localStorage.getItem(storageKey) ?? 'null')
    if (
      value?.version !== 1 ||
      !object(value.respuestas) ||
      !object(value.preguntas) ||
      !object(value.escenarios) ||
      !['evaluaciones', 'eventos', 'desbloqueos'].every((key) => Array.isArray(value[key]))
    )
      return initialReflectionState()
    const responses = Object.fromEntries(
      Object.entries(value.respuestas).filter(([key, entry]) => {
        const r = entry as RegistryResponse
        return (
          object(r) &&
          key === `${r.actividadId}/${r.nodoId}` &&
          typeof r.id === 'string' &&
          typeof r.estudianteId === 'string' &&
          Number.isInteger(r.version) &&
          r.version > 0 &&
          Number.isInteger(r.revision) &&
          r.revision >= 0 &&
          strings(r.entregaIds) &&
          typeof r.textoInicial === 'string' &&
          typeof r.textoCompleto === 'string' &&
          ['FINAL', 'EN_SEGUIMIENTO'].includes(r.estado)
        )
      }),
    )
    const evaluations = value.evaluaciones.filter(
      (e: Evaluation) =>
        object(e) &&
        typeof e.id === 'string' &&
        typeof e.respuestaId === 'string' &&
        Number.isInteger(e.version) &&
        Number.isInteger(e.revision) &&
        typeof e.texto === 'string' &&
        strings(e.criteriosFaltantes) &&
        ['ADECUADA', 'INSUFICIENTE', 'NO_EVALUADA'].includes(e.clasificacion),
    )
    return { ...initialReflectionState(), ...value, respuestas: responses, evaluaciones: evaluations }
  } catch {
    return initialReflectionState()
  }
}
let state = read()
const listeners = new Set<() => void>()
const subscribe = (listener: () => void) => {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}
export const getReflections = () => state
export const useReflections = () => useSyncExternalStore(subscribe, () => state)
export function updateReflections(update: (current: ReflectionState) => ReflectionState) {
  const next = update(state)
  if (next === state) return true
  try {
    localStorage.setItem(storageKey, JSON.stringify(next))
    state = next
  } catch {
    return false
  }
  listeners.forEach((listener) => listener())
  return true
}
export function currentEvaluation(response: RegistryResponse, source = state): Evaluation | undefined {
  return source.evaluaciones.findLast(
    (e) =>
      e.respuestaId === response.id && e.version === response.version && e.revision === response.revision,
  )
}
export function isDeveloped(response: RegistryResponse | undefined, source = state) {
  return (
    !!response &&
    response.estado === 'FINAL' &&
    currentEvaluation(response, source)?.clasificacion === 'ADECUADA'
  )
}
// Completion, event and optional unlocks are committed together, including after recovery.
export function closeResponse(key: string) {
  return updateReflections((current) => {
    const response = current.respuestas[key]
    if (!response) return current
    const next = {
      ...current,
      respuestas: { ...current.respuestas, [key]: { ...response, estado: 'FINAL' as const } },
    }
    if (isDeveloped(next.respuestas[key], next) && !next.eventos.some((e) => e.respuestaId === response.id))
      next.eventos = [
        ...next.eventos,
        { tipo: 'RESPUESTA_REFLEXIVA', respuestaId: response.id, fechaHora: new Date().toISOString() },
      ]
    const unlocked = additionalMissions.filter(
      (mission) =>
        !next.desbloqueos.some((d) => d.actividadId === mission.id) &&
        mission.reglas.some((r) => isDeveloped(next.respuestas[`${r.actividadId}/${r.nodoId}`], next)),
    )
    next.desbloqueos = [
      ...next.desbloqueos,
      ...unlocked.map((m) => ({
        actividadId: m.id,
        actividadOrigen: m.actividadOrigen,
        fechaHora: new Date().toISOString(),
        visto: false,
      })),
    ]
    return next
  })
}
window.addEventListener('storage', (event) => {
  if (event.key === storageKey || event.key === null) {
    state = read()
    listeners.forEach((listener) => listener())
  }
})
