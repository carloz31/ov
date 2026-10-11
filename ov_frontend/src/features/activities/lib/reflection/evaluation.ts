import type { Actividad, Entregable, NodoConsigna } from '@/types/activities'
import { latestSubmission, studentId, applyCompletion } from '@/lib/activities/logic'
import { getJourneySnapshot, journeyEnServidor, updateJourney } from '@/store/journeyStore'
import { criteria } from '@/data/activities/reflectionConfig'
import { closeResponse, currentEvaluation, getReflections, updateReflections } from '@/store/reflectionStore'
import { bounded, getReflectionProvider, metadata, type EvaluationResult } from './provider'
import type { Evaluation } from '@/types/reflection'

export function beginResponse(activity: Actividad, node: NodoConsigna, entry: Entregable) {
  if (entry.contenido.tipo !== 'texto') return false
  const text = entry.contenido.texto
  const key = `${activity.id}/${node.id}`
  return updateReflections((s) => {
    const previous = s.respuestas[key]
    return {
      ...s,
      respuestas: {
        ...s.respuestas,
        [key]: {
          id: previous?.id ?? crypto.randomUUID(),
          estudianteId: studentId,
          actividadId: activity.id,
          nodoId: node.id,
          version: entry.version,
          revision: 0,
          entregaIds: [...(previous?.entregaIds ?? []), entry.id],
          estado: 'EN_SEGUIMIENTO',
          textoInicial: text,
          textoCompleto: text,
        },
      },
    }
  })
}
const evaluating = new Map<string, Promise<Evaluation | undefined>>()
export function evaluateResponse(activity: Actividad, node: NodoConsigna, text: string, revision: number) {
  const key = `${activity.id}/${node.id}`
  const response = getReflections().respuestas[key]
  if (!response || !criteria[key]) return Promise.resolve(undefined)
  const identity = `${response.id}/${response.version}/${revision}`
  const existing = getReflections().evaluaciones.find(
    (e) => `${e.respuestaId}/${e.version}/${e.revision}` === identity,
  )
  if (existing) return Promise.resolve(existing)
  const pending = evaluating.get(identity)
  if (pending) return pending
  if (response.revision > revision) return Promise.resolve(undefined)
  if (
    !updateReflections((s) => ({
      ...s,
      respuestas: { ...s.respuestas, [key]: { ...s.respuestas[key], revision } },
    }))
  )
    return Promise.resolve(undefined)
  const operation = (async () => {
    const started = Date.now()
    const enunciado = getReflections().preguntas[key]?.texto ?? node.premisa
    let result: EvaluationResult
    try {
      result = await bounded(
        (signal) =>
          getReflectionProvider().evaluateResponse(
            {
              estudianteId: studentId,
              respuestaId: response.id,
              clave: key,
              enunciado,
              criterios: criteria[key],
              texto: text,
              intento: revision,
            },
            signal,
          ),
        10_000,
      )
      if (
        !['ADECUADA', 'INSUFICIENTE', 'NO_EVALUADA'].includes(result.clasificacion) ||
        !Array.isArray(result.criteriosFaltantes)
      )
        throw new Error('Salida de evaluación inválida')
      const missing = result.criteriosFaltantes
      result = {
        ...result,
        criteriosFaltantes:
          result.clasificacion === 'INSUFICIENTE'
            ? criteria[key].filter((c) => missing.includes(c.id)).map((c) => c.id)
            : [],
        preguntaSeguimiento: result.clasificacion === 'INSUFICIENTE' ? result.preguntaSeguimiento : undefined,
      }
    } catch (error) {
      result = {
        ...metadata(started, error instanceof Error ? error.message : 'Fallo de evaluación'),
        clasificacion: 'NO_EVALUADA' as const,
        criteriosFaltantes: [],
      }
    }
    const latest = latestSubmission(getJourneySnapshot(), activity.id, node.id)
    const now = getReflections().respuestas[key]
    if (
      !now ||
      now.id !== response.id ||
      now.version !== response.version ||
      now.revision !== revision ||
      latest?.version !== response.version
    )
      return undefined
    const evaluation: Evaluation = {
      ...result,
      id: crypto.randomUUID(),
      respuestaId: response.id,
      version: response.version,
      revision,
      texto: text,
    }
    const saved = updateReflections((s) => {
      if (s.evaluaciones.some((e) => `${e.respuestaId}/${e.version}/${e.revision}` === identity)) return s
      return {
        ...s,
        respuestas: { ...s.respuestas, [key]: { ...s.respuestas[key], revision, textoCompleto: text } },
        evaluaciones: [...s.evaluaciones, evaluation],
      }
    })
    return saved ? evaluation : undefined
  })()
  evaluating.set(identity, operation)
  void operation.finally(() => evaluating.delete(identity))
  return operation
}
export function finalizeResponse(activity: Actividad, node: NodoConsigna) {
  const key = `${activity.id}/${node.id}`
  const latest = latestSubmission(getJourneySnapshot(), activity.id, node.id)
  if (!latest || !getReflections().respuestas[key]) return false
  // A condensed delivery is a new immutable version of the same evaluated answers.
  if (
    !updateReflections((s) => {
      const response = s.respuestas[key]
      if (!response) return s
      const evaluation = currentEvaluation(response, s)
      const changed = latest.version !== response.version
      return {
        ...s,
        respuestas: {
          ...s.respuestas,
          [key]: {
            ...response,
            version: latest.version,
            entregaIds: response.entregaIds.includes(latest.id)
              ? response.entregaIds
              : [...response.entregaIds, latest.id],
          },
        },
        evaluaciones:
          changed && evaluation
            ? [...s.evaluaciones, { ...evaluation, id: crypto.randomUUID(), version: latest.version }]
            : s.evaluaciones,
      }
    })
  )
    return false
  if (!closeResponse(key)) return false
  return journeyEnServidor() || updateJourney((s) => applyCompletion(activity, s))
}
