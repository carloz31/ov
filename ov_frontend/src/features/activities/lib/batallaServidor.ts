import type { Battle, Challenge } from '@/types/challenges'
import type { PreguntaIntento, RespuestaBatallaEntrada } from '@/types/servidor'

// F04b: las preguntas de un intento vienen del servidor; el desafío del front pone vidas y destellos.
// Un intento debe poder terminar: hacen falta al menos vidas del enemigo + destellos − 1 preguntas.
export function batallaDesdePreguntas(c: Challenge, preguntas: PreguntaIntento[]): Battle | undefined {
  if (preguntas.length < c.vidasEnemigo + c.vidasEstudiante - 1) return undefined
  return {
    questions: preguntas.map((p) => ({
      id: p.codigo,
      enunciado: p.enunciado,
      // La opción se identifica por su índice en el servidor, que es lo que se responde.
      opciones: p.opciones.map((o) => ({ id: String(o.indice), texto: o.texto })),
      correcta: String(p.correcta),
      explicacion: p.explicacion,
      ficha: p.ficha,
    })),
    index: 0,
    enemyLife: c.vidasEnemigo,
    sparks: c.vidasEstudiante,
    hits: 0,
    answered: 0,
    finished: false,
  }
}

export const respuestaBatalla = (pregunta: string, opcion: string): RespuestaBatallaEntrada => ({
  pregunta,
  opcion: Number(opcion),
})
