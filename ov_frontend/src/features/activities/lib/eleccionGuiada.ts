import type { ItemRegistroPublico, OpcionElegida } from '@/types/servidor'
import { enumerar } from './finishSummary'

// Elección guiada (F01): «elegir entre mínima y máxima opciones sin orden + explicar». Lógica pura.
// Se usa en toda elección sin orden de lista propia o común, también si retoma una anterior (F02).
export const esEleccionGuiada = (item: ItemRegistroPublico) => !!item.eleccion && !item.eleccion.ordenada

// Validación común de los registros guiados: el texto debe llegar al mínimo del ítem (o 1 si es
// obligatorio y no tiene mínimo).
export function errorTexto(item: ItemRegistroPublico, texto: string) {
  const minimo = item.min_caracteres ?? (item.obligatorio ? 1 : 0)
  return texto.trim().length < minimo ? `Escribe al menos ${minimo} caracteres.` : undefined
}

export type ReglasEleccion = { maxima: number; exclusivas: string[] }

// Tocar alterna. Una exclusiva quita las demás y elegir otra quita la exclusiva. Con máxima 1, tocar
// otra reemplaza la elegida (radio); con el máximo alcanzado, una más no reemplaza: queda bloqueada.
export function alternar(seleccion: OpcionElegida[], codigo: string, reglas: ReglasEleccion) {
  if (seleccion.some((o) => o.codigo === codigo))
    return { seleccion: seleccion.filter((o) => o.codigo !== codigo), bloqueada: false }
  if (reglas.exclusivas.includes(codigo)) return { seleccion: [{ codigo }], bloqueada: false }
  if (reglas.maxima === 1) return { seleccion: [{ codigo }], bloqueada: false }
  const base = seleccion.filter((o) => !reglas.exclusivas.includes(o.codigo))
  if (base.length >= reglas.maxima) return { seleccion, bloqueada: true }
  return { seleccion: [...base, { codigo }], bloqueada: false }
}

export function conTextoOtra(seleccion: OpcionElegida[], texto: string): OpcionElegida[] {
  return seleccion.map((o) => (o.codigo === 'OTRA' ? { codigo: 'OTRA', texto } : o))
}

// F02: lo elegido es exactamente lo de la vez pasada (sin importar el orden).
const mismaEleccion = (seleccion: OpcionElegida[], anteriores: string[]) =>
  seleccion.length === anteriores.length && seleccion.every((o) => anteriores.includes(o.codigo))

const enFrase = (texto: string) => texto.charAt(0).toLocaleLowerCase('es') + texto.slice(1)

export type TextosEleccion = {
  pregunta: string // «¿Por qué te atrae {opciones}?»
  preguntas?: Record<string, string> // con una sola opción elegida, la pregunta propia de esa opción
  preguntaExclusiva?: string
  preguntaMantiene?: string
  preguntaCambia?: string
}
// La pregunta nombra lo elegido en minúsculas dentro de la frase («estudiar en una universidad y
// emprender un negocio»); «Otra» se nombra con lo que escribió el estudiante.
export function preguntaEleccion(
  textos: TextosEleccion,
  seleccion: OpcionElegida[],
  opciones: { codigo: string; texto: string }[],
  exclusivas: string[],
  // F02: lo elegido la vez pasada, si el ítem retoma una elección; decide si mantiene o cambia.
  anteriores: string[] = [],
) {
  if (seleccion.some((o) => exclusivas.includes(o.codigo)) && textos.preguntaExclusiva)
    return textos.preguntaExclusiva
  const mismo = mismaEleccion(seleccion, anteriores)
  const segun = anteriores.length ? (mismo ? textos.preguntaMantiene : textos.preguntaCambia) : undefined
  if (!segun && seleccion.length === 1 && textos.preguntas?.[seleccion[0].codigo])
    return textos.preguntas[seleccion[0].codigo]
  const nombres = seleccion.map((o) =>
    o.codigo === 'OTRA'
      ? enFrase(o.texto?.trim() || 'otra opción')
      : enFrase(opciones.find((x) => x.codigo === o.codigo)?.texto ?? o.codigo),
  )
  return (segun ?? textos.pregunta).replace('{opciones}', enumerar(nombres))
}

export type MensajesEleccion = {
  inicio: string
  una: string
  maximo?: string // con el máximo alcanzado (máxima > 1)
  bloqueada?: string // al tocar una más con el máximo alcanzado
  exclusiva?: string
}
export function mensajeEleccion(
  mensajes: MensajesEleccion,
  seleccion: OpcionElegida[],
  reglas: ReglasEleccion,
  bloqueada: boolean,
  // F02: si el ítem retoma una elección, lo de la vez pasada llega marcado y se saluda con `inicio`.
  anteriores: string[] = [],
) {
  if (!seleccion.length || (anteriores.length && mismaEleccion(seleccion, anteriores))) return mensajes.inicio
  if (seleccion.some((o) => reglas.exclusivas.includes(o.codigo)) && mensajes.exclusiva)
    return mensajes.exclusiva
  if (bloqueada && mensajes.bloqueada) return mensajes.bloqueada
  if (reglas.maxima > 1 && seleccion.length >= reglas.maxima && mensajes.maximo) return mensajes.maximo
  return mensajes.una
}
