import type { FollowUpTurn } from './followUpService'

export type CondenseInput = {
  textoInicial: string
  turnos: FollowUpTurn[]
  premisa: string
  maxCaracteres?: number
}

export interface ResponseCondenser {
  condense(input: CondenseInput): Promise<string>
}

export function answeredTurns(turns: FollowUpTurn[]) {
  return turns.filter((turn) => !turn.omitida && !!turn.respuesta?.trim())
}

export function buildCondensedResponse(input: CondenseInput): string {
  const blocks = answeredTurns(input.turnos).map(
    (turn) => `Pregunta de Lumi: ${turn.pregunta}\nRespuesta: ${turn.respuesta}`,
  )
  const text = [input.textoInicial, ...blocks].join('\n\n')
  if (text.length > (input.maxCaracteres ?? Infinity))
    throw new RangeError('La respuesta condensada supera el límite de la entrega.')
  return text
}

export function responseCapacity(input: CondenseInput, question: string): number {
  const current = buildCondensedResponse({ ...input, maxCaracteres: undefined })
  const prefix = `\n\nPregunta de Lumi: ${question}\nRespuesta: `
  return Math.max(0, Math.min(400, (input.maxCaracteres ?? Infinity) - current.length - prefix.length))
}

export const templateCondenser: ResponseCondenser = {
  async condense(input) {
    return buildCondensedResponse(input)
  },
}
