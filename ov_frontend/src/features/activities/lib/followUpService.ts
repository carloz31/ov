import { criteria } from '@/data/activities/reflectionConfig'
import { bounded, getReflectionProvider } from './reflection/provider'
import { studentId } from '@/lib/activities/logic'

export type FollowUpTurn = {
  orden: 1 | 2
  pregunta: string
  respuesta?: string
  omitida: boolean
  creadaEn: string
  respondidaEn?: string
}

export type FollowUpInput = {
  activityId: string
  nodeId: string
  premisa: string
  ayuda?: string
  texto: string
  minCaracteres?: number
  turnosPrevios: FollowUpTurn[]
}

export interface FollowUpService {
  evaluate(input: FollowUpInput): Promise<{ pregunta?: string }>
}

export const mockFollowUpService: FollowUpService = {
  async evaluate(input) {
    const key = `${input.activityId}/${input.nodeId}`
    if (!criteria[key]) return {}
    const result = await bounded(
      (signal) =>
        getReflectionProvider().evaluateResponse(
          {
            estudianteId: studentId,
            respuestaId: key,
            clave: key,
            enunciado: input.premisa,
            criterios: criteria[key],
            texto: input.texto,
            intento: input.turnosPrevios.filter((t) => !t.omitida && t.respuesta !== undefined).length,
          },
          signal,
        ),
      10_000,
    )
    return result.clasificacion === 'INSUFICIENTE' ? { pregunta: result.preguntaSeguimiento } : {}
  },
}

export async function evaluateFollowUp(
  service: FollowUpService,
  input: FollowUpInput,
): Promise<{ pregunta?: string }> {
  let timer: ReturnType<typeof setTimeout> | undefined
  try {
    return await Promise.race([
      service.evaluate(input),
      new Promise<{ pregunta?: string }>((resolve) => {
        timer = setTimeout(() => resolve({}), 10_000)
      }),
    ])
  } catch {
    return {}
  } finally {
    clearTimeout(timer)
  }
}
