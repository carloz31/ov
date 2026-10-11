import { applyCompletion, studentId } from '@/lib/activities/logic'
import type { JourneyState } from '@/types/activities'
import type { Challenge, Battle, ChallengeResult } from '@/types/challenges'

export function randomWinProbability(enemy: number, sparks: number, options: number) {
  const p = 1 / options
  let previous = Array(sparks + 1).fill(1) as number[]
  for (let e = 1; e <= enemy; e++) {
    const row = Array(sparks + 1).fill(0) as number[]
    for (let s = 1; s <= sparks; s++) row[s] = p * previous[s] + (1 - p) * row[s - 1]
    previous = row
  }
  return previous[sparks]
}
export function validateChallenge(c: Challenge) {
  const errors: string[] = []
  if (![c.vidasEnemigo, c.vidasEstudiante].every((n) => Number.isSafeInteger(n) && n >= 1))
    errors.push('Las vidas deben ser enteros positivos.')
  if (!Number.isInteger(c.opcionesPorPregunta) || c.opcionesPorPregunta < 3 || c.opcionesPorPregunta > 5)
    errors.push('Cada pregunta debe tener de 3 a 5 opciones.')
  if (!c.requisitos.length) errors.push('El desafío debe exigir al menos una ficha o actividad.')
  if (c.banco.length < c.vidasEnemigo + c.vidasEstudiante - 1)
    errors.push('El banco no alcanza para un intento sin repetir preguntas.')
  if (new Set(c.banco.map((q) => q.id)).size !== c.banco.length)
    errors.push('Las preguntas deben tener identificadores únicos.')
  if (
    c.banco.some(
      (q) =>
        !q.enunciado.trim() ||
        !q.explicacion.trim() ||
        q.opciones.length !== c.opcionesPorPregunta ||
        new Set(q.opciones.map((o) => o.id)).size !== q.opciones.length ||
        q.opciones.filter((o) => o.id === q.correcta).length !== 1 ||
        q.opciones.some((o) => !o.texto.trim()),
    )
  )
    errors.push('Cada pregunta debe tener opciones consistentes, una correcta y una explicación.')
  if (!errors.length && randomWinProbability(c.vidasEnemigo, c.vidasEstudiante, c.opcionesPorPregunta) >= 0.1)
    errors.push('La probabilidad de vencer al azar debe ser menor al 10 %.')
  return errors
}
export function challengeRequirements(c: Challenge, state: JourneyState) {
  return c.requisitos.map((r) => ({
    ...r,
    completed:
      r.tipo === 'actividad'
        ? state.progress[r.id]?.estado === 'completada'
        : (state.readResourceIds ?? state.resources).includes(r.id),
  }))
}
export const canStartChallenge = (c: Challenge, state: JourneyState) =>
  challengeRequirements(c, state).every((r) => r.completed)
function shuffle<T>(items: T[], random: () => number) {
  const result = [...items]
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1))
    ;[result[i], result[j]] = [result[j], result[i]]
  }
  return result
}
export function startBattle(c: Challenge, previousIds: string[] = [], random = Math.random): Battle {
  const errors = validateChallenge(c)
  if (errors.length) throw new Error(errors.join(' '))
  const questions = [
    ...shuffle(
      c.banco.filter((q) => !previousIds.includes(q.id)),
      random,
    ),
    ...shuffle(
      c.banco.filter((q) => previousIds.includes(q.id)),
      random,
    ),
  ]
  return {
    questions,
    index: 0,
    enemyLife: c.vidasEnemigo,
    sparks: c.vidasEstudiante,
    hits: 0,
    answered: 0,
    finished: false,
  }
}
export function answerBattle(b: Battle, id: string): Battle {
  if (b.selected || b.finished || !b.questions[b.index]?.opciones.some((o) => o.id === id)) return b
  const hit = b.questions[b.index].correcta === id
  const enemyLife = b.enemyLife - Number(hit),
    sparks = b.sparks - Number(!hit)
  return {
    ...b,
    selected: id,
    enemyLife,
    sparks,
    hits: b.hits + Number(hit),
    answered: b.answered + 1,
    finished: enemyLife === 0 || sparks === 0,
  }
}
export function recordBattle(
  c: Challenge,
  b: Battle,
  state: JourneyState,
  now = new Date().toISOString(),
): JourneyState {
  if (!b.finished || state.progress[c.id]?.estado === 'completada') return state
  const victory = b.enemyLife === 0
  const result: ChallengeResult = {
    estudianteId: studentId,
    actividadId: c.id,
    fechaHora: now,
    victoria: victory,
    aciertos: b.hits,
    preguntas: b.answered,
    vidasRestantes: b.sparks,
    ...(victory
      ? {
          evento: 'COMPLETA_ACTIVIDAD' as const,
          logroOculto: b.sparks === c.vidasEstudiante ? c.logroOculto?.codigo : undefined,
        }
      : {}),
  }
  const recorded = { ...state, challengeResults: [...(state.challengeResults ?? []), result] }
  if (!victory) return recorded
  return applyCompletion(
    { ...c, tipo: 'encuentro', requisitos: [] },
    {
      ...recorded,
      progress: {
        ...recorded.progress,
        [c.id]: { estudianteId: studentId, actividadId: c.id, estado: 'en_curso', nodoActualId: '$fin' },
      },
    },
  )
}
export function firstAttemptVictoryRate(results: ChallengeResult[], id: string) {
  const first = new Map<string, ChallengeResult>()
  for (const r of [...results].sort((a, b) => Date.parse(a.fechaHora) - Date.parse(b.fechaHora)))
    if (r.actividadId === id && !first.has(r.estudianteId)) first.set(r.estudianteId, r)
  return {
    students: first.size,
    percent: first.size ? (100 * [...first.values()].filter((r) => r.victoria).length) / first.size : 0,
  }
}
