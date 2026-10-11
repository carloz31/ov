import type { AiMetadata, Classification, Criterion, Scenario } from '@/types/reflection'
import { getReflections } from '@/store/reflectionStore'
import { presentationScenarios } from '@/data/activities/reflectionConfig'
import { studentDemoEnabled } from '@/config/studentDemoScope'

export type EvaluationInput = {
  estudianteId: string
  respuestaId: string
  clave: string
  enunciado: string
  criterios: Criterion[]
  texto: string
  intento: number
}
export type EvaluationResult = AiMetadata & {
  clasificacion: Classification
  criteriosFaltantes: string[]
  preguntaSeguimiento?: string
}
export type QuestionInput = {
  estudianteId: string
  clave: string
  preguntaBase: string
  instruccion: string
  tituloOrigen: string
  respuestaOrigen: string
  plantillaSimulada: string
}
export interface ReflectionProvider {
  evaluateResponse(input: EvaluationInput, signal: AbortSignal): Promise<EvaluationResult>
  generatePersonalizedQuestion(
    input: QuestionInput,
    signal: AbortSignal,
  ): Promise<AiMetadata & { pregunta: string; cita: string }>
}
export const metadata = (started: number, error?: string): AiMetadata => ({
  modelo: 'simulado',
  versionPrompt: 'bloque1-v1',
  latenciaMs: Date.now() - started,
  fechaHora: new Date().toISOString(),
  ...(error ? { error } : {}),
})
function scenario(student: string, key: string, response?: string): Scenario | undefined {
  if (studentDemoEnabled && presentationScenarios[key]) return presentationScenarios[key]
  const scenarios = getReflections().escenarios
  return scenarios[response ?? key] ?? scenarios[key] ?? scenarios[student]
}
async function delay(signal: AbortSignal, ms = 250) {
  await new Promise<void>((resolve, reject) => {
    const timer = setTimeout(() => {
      signal.removeEventListener('abort', abort)
      resolve()
    }, ms)
    const abort = () => {
      clearTimeout(timer)
      reject(new Error('Tiempo agotado'))
    }
    signal.addEventListener('abort', abort, { once: true })
    if (signal.aborted) abort()
  })
}
export const simulatedProvider: ReflectionProvider = {
  async evaluateResponse(input, signal) {
    const started = Date.now()
    const config = scenario(input.estudianteId, input.clave, input.respuestaId)
    if (!config)
      return {
        ...metadata(started, 'Sin escenario configurado'),
        clasificacion: 'NO_EVALUADA',
        criteriosFaltantes: [],
      }
    const result =
      config.evaluaciones[Math.min(input.intento, config.evaluaciones.length - 1)] ?? 'NO_EVALUADA'
    await delay(signal, result === 'TIMEOUT' ? 20_000 : 250)
    if (result === 'FALLO') throw new Error('Fallo simulado de evaluación')
    const clasificacion = result === 'TIMEOUT' ? 'NO_EVALUADA' : result
    const missing =
      clasificacion === 'INSUFICIENTE'
        ? input.criterios.filter((c) =>
            config.criteriosFaltantes ? config.criteriosFaltantes.includes(c.id) : true,
          )
        : []
    return {
      ...metadata(started),
      clasificacion,
      criteriosFaltantes: missing.map((c) => c.id),
      preguntaSeguimiento: missing[0]?.seguimiento,
    }
  },
  async generatePersonalizedQuestion(input, signal) {
    const started = Date.now()
    const mode = scenario(input.estudianteId, input.clave)?.generacion ?? 'VALIDA'
    await delay(signal, mode === 'TIMEOUT' ? 20_000 : 250)
    if (mode === 'FALLO') throw new Error('Fallo simulado de personalización')
    const words = input.respuestaOrigen.match(/\S+/g) ?? []
    const cita =
      mode === 'CITA_INVALIDA'
        ? 'Una cita que no escribiste'
        : words.slice(0, Math.min(8, words.length)).join(' ')
    return { ...metadata(started), cita, pregunta: input.plantillaSimulada.replace('{cita}', cita) }
  },
}
let provider: ReflectionProvider = simulatedProvider
export const getReflectionProvider = () => provider
export function setReflectionProvider(next: ReflectionProvider) {
  provider = next
}
export async function bounded<T>(operation: (signal: AbortSignal) => Promise<T>, limit: number): Promise<T> {
  const controller = new AbortController()
  let timer: ReturnType<typeof setTimeout> | undefined
  try {
    return await Promise.race([
      operation(controller.signal),
      new Promise<never>((_, reject) => {
        timer = setTimeout(() => {
          controller.abort()
          reject(new Error('Tiempo agotado'))
        }, limit)
      }),
    ])
  } finally {
    clearTimeout(timer)
    controller.abort()
  }
}
