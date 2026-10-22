import type { Battle } from '@/types/challenges'
import type { ContenidoEstado, PreguntaIntento, RespuestaBatallaEntrada } from '@/types/servidor'

// F04b: las preguntas de un intento vienen del servidor; F04c: también las vidas y los destellos.
// Un intento debe poder terminar: hacen falta al menos vidas del enemigo + destellos − 1 preguntas.
export type ConfiguracionBatalla = { vidasEnemigo: number; destellos: number }
export function batallaDesdePreguntas(
  config: ConfiguracionBatalla,
  preguntas: PreguntaIntento[],
): Battle | undefined {
  if (preguntas.length < config.vidasEnemigo + config.destellos - 1) return undefined
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
    enemyLife: config.vidasEnemigo,
    sparks: config.destellos,
    hits: 0,
    answered: 0,
    finished: false,
  }
}

export const respuestaBatalla = (pregunta: string, opcion: string): RespuestaBatallaEntrada => ({
  pregunta,
  opcion: Number(opcion),
})

// Orden del repaso tras perder: primero la ficha con más preguntas falladas en el intento; si empatan, la
// de la primera pregunta fallada. Las fichas sin fallos quedan después, en su orden. `fallos` es la ficha
// de cada pregunta fallada, en el orden en que se fallaron.
export function ordenFichasRepaso(fichas: string[], fallos: string[]): string[] {
  const errores = (f: string) => fallos.filter((x) => x === f).length
  const primero = (f: string) => (fallos.includes(f) ? fallos.indexOf(f) : Infinity)
  return [...fichas].sort(
    (a, b) => errores(b) - errores(a) || primero(a) - primero(b) || fichas.indexOf(a) - fichas.indexOf(b),
  )
}

// Las fichas de una batalla que se pueden repasar: las que la cuenta ya tiene y tienen contenido en el front.
export const fichasDeRepaso = (fichas: ContenidoEstado[], conContenido: (codigo: string) => boolean) =>
  fichas.filter((f) => f.estado === 'DISPONIBLE' && conContenido(f.codigo))
