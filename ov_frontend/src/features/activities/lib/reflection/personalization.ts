import type { Actividad, NodoConsigna } from '@/types/activities'
import { latestSubmission, studentId } from '@/lib/activities/logic'
import { getJourneySnapshot } from '@/store/journeyStore'
import { activityById } from '@/data/activities/content'
import { criteria, personalizations, reflectionCopy, routeOrder } from '@/data/activities/reflectionConfig'
import { currentEvaluation, getReflections, isDeveloped, updateReflections } from '@/store/reflectionStore'
import { bounded, getReflectionProvider, metadata } from './provider'
import type { ShownQuestion } from '@/types/reflection'

const normalize = (text: string) => text.toLocaleLowerCase().replace(/\s+/g, ' ').trim()
export function validPersonalizedQuestion(question: string, quote: string, source: string) {
  if (typeof question !== 'string' || typeof quote !== 'string' || !quote.trim()) return false
  const count = quote.trim().split(/\s+/).length
  const sentences = question.match(/[^.!?]+[.!?](?:[»”"]|$|\s)/g) ?? []
  return (
    count >= 3 &&
    count <= 15 &&
    normalize(source).includes(normalize(quote)) &&
    question.includes(`«${quote}»`) &&
    question.trim().split(/\s+/).length <= 45 &&
    sentences.length >= 1 &&
    sentences.length <= 2
  )
}
const preparing = new Map<string, Promise<ShownQuestion>>()
export function prepareQuestion(activity: Actividad, node: NodoConsigna) {
  const key = `${activity.id}/${node.id}`
  const previous = getReflections().preguntas[key]
  if (previous) return Promise.resolve(previous)
  const pending = preparing.get(key)
  if (pending) return pending
  const operation = (async () => {
    const started = Date.now()
    const config = personalizations[key]
    const ref = config?.itemsOrigen[0]
    const snapshot = getReflections()
    const source = ref && snapshot.respuestas[`${ref.actividadId}/${ref.nodoId}`]
    const sourceSubmission = ref && latestSubmission(getJourneySnapshot(), ref.actividadId, ref.nodoId)
    const sourceActivity = ref && activityById(ref.actividadId)
    const sourceNode = sourceActivity?.nodos.find((n) => n.id === ref?.nodoId)
    // Only explicitly configured public registries can supply prior student text.
    const allowed =
      ref &&
      sourceActivity?.tipo === 'registro' &&
      sourceNode?.tipo === 'consigna' &&
      sourceNode.visibilidad !== 'solo_estudiante' &&
      criteria[`${ref.actividadId}/${ref.nodoId}`] &&
      ref.nodoId !== 'mission-story-entry' &&
      ref.nodoId !== 'mission-future-entry' &&
      routeOrder(ref.actividadId) >= 0 &&
      routeOrder(ref.actividadId) < routeOrder(activity.id) &&
      source?.estado === 'FINAL' &&
      source.estudianteId === studentId &&
      sourceSubmission?.version === source.version
    const evaluation = allowed && source ? currentEvaluation(source, snapshot) : undefined
    let result: ShownQuestion = {
      id: key,
      estudianteId: studentId,
      tipo: 'GENERICA_RESPALDO',
      texto: node.premisa,
      criteriosFaltantesOrigen: [],
      ...metadata(started),
    }
    if (allowed && source && evaluation?.clasificacion === 'INSUFICIENTE') {
      result = {
        ...result,
        tipo: 'GENERICA_FALTA_DETALLE',
        criteriosFaltantesOrigen: evaluation.criteriosFaltantes,
        respuestaOrigen: {
          ...ref,
          respuestaId: source.id,
          version: source.version,
          texto: source.textoCompleto,
          titulo: sourceTitle(ref.actividadId),
        },
      }
    } else if (allowed && source && isDeveloped(source, snapshot)) {
      try {
        const generated = await bounded(async (signal) => {
          for (let attempt = 0; attempt < 2; attempt++) {
            const output = await getReflectionProvider().generatePersonalizedQuestion(
              {
                estudianteId: studentId,
                clave: key,
                preguntaBase: node.premisa,
                instruccion: config.instruccion,
                tituloOrigen: sourceTitle(ref.actividadId),
                respuestaOrigen: source.textoCompleto,
                plantillaSimulada: config.plantillaSimulada,
              },
              signal,
            )
            if (validPersonalizedQuestion(output.pregunta, output.cita, source.textoCompleto)) return output
          }
          throw new Error('Cita o pregunta inválida después de dos intentos')
        }, 6000)
        result = {
          ...result,
          ...generated,
          latenciaMs: Date.now() - started,
          tipo: 'PERSONALIZADA',
          texto: generated.pregunta,
          cita: generated.cita,
          respuestaOrigen: {
            ...ref,
            respuestaId: source.id,
            version: source.version,
            texto: source.textoCompleto,
            titulo: sourceTitle(ref.actividadId),
          },
        }
      } catch (error) {
        result = {
          ...result,
          ...metadata(started, error instanceof Error ? error.message : 'Fallo de generación'),
        }
      }
    }
    if (
      !updateReflections((s) =>
        s.preguntas[key] ? s : { ...s, preguntas: { ...s.preguntas, [key]: result } },
      )
    )
      throw new Error('No se pudo guardar el enunciado. Vuelve a intentarlo.')
    return getReflections().preguntas[key]
  })()
  preparing.set(key, operation)
  void operation.then(
    () => preparing.delete(key),
    () => preparing.delete(key),
  )
  return operation
}
export function prepareActivity(activity: Actividad) {
  return Promise.allSettled(
    activity.nodos
      .filter((n): n is NodoConsigna => n.tipo === 'consigna' && !!personalizations[`${activity.id}/${n.id}`])
      .map((node) => prepareQuestion(activity, node)),
  )
}
const sourceTitle = (id: string) =>
  ({
    'act-07': 'Mis propios pregones',
    'mission-story': 'Las huellas que traigo',
    'mission-future': 'Mi horizonte',
  })[id] ?? id
export function missingPhrases(question: ShownQuestion) {
  if (!question.respuestaOrigen) return 'lo que te pedía la pregunta'
  const ref = question.respuestaOrigen
  const phrases = (criteria[`${ref.actividadId}/${ref.nodoId}`] ?? [])
    .filter((c) => question.criteriosFaltantesOrigen.includes(c.id))
    .map((c) => c.fraseAviso ?? 'lo que te pedía la pregunta')
    .slice(0, 2)
  return phrases.length ? phrases.join(' ni ') : 'lo que te pedía la pregunta'
}
export function missingNotice(question: ShownQuestion) {
  if (question.tipo !== 'GENERICA_FALTA_DETALLE' || !question.respuestaOrigen) return undefined
  return reflectionCopy.missing(question.respuestaOrigen.titulo, missingPhrases(question))
}
export function questionInfluencesLater(activityId: string, nodeId: string) {
  return Object.values(personalizations).some((p) =>
    p.itemsOrigen.some((ref) => ref.actividadId === activityId && ref.nodoId === nodeId),
  )
}
