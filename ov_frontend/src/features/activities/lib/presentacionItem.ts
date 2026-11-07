import type { NodoConsigna } from '@/types/activities'
import type { EleccionPublica, ItemRegistroPublico, OpcionElegida } from '@/types/servidor'
import { cierraSinSeguimiento } from '@/lib/servidor/adaptadoresRegistro'

// Ajuste vista del ítem de registro: cómo se presenta un ítem (personaje, bloque de elección y bloque de
// texto, en el orden del nodo). Lógica pura. Los JSON de `ruta` que no traen los campos de presentación
// usan los textos de antes: la consigna del servidor sobre las opciones (o sobre el campo, si no hay elección)
// y la pregunta de la elección sobre el campo.

export const LEYENDA_ITEM = 'Lo ven tú y tu orientadora'
export const PREGUNTA_SIN_SEGUIMIENTO = 'Si quieres, cuéntame un poco más'
export const ENTRADA_POR_DEFECTO = 'Escribe con tus palabras, no hay respuestas incorrectas'

export const textoPrimero = (node: NodoConsigna) => node.orden === 'texto-primero'

// Los bloques en el orden del nodo: elección primero (por defecto) o texto primero.
export function enOrden<T>(node: NodoConsigna, eleccion: T, texto: T) {
  return textoPrimero(node) ? [texto, eleccion] : [eleccion, texto]
}

// Numerales de los bloques: solo con dos bloques; con `texto-primero` se invierten.
export function numerales(node: NodoConsigna, hayEleccion: boolean) {
  if (!hayEleccion) return { eleccion: undefined, texto: undefined }
  return textoPrimero(node) ? { eleccion: 2, texto: 1 } : { eleccion: 1, texto: 2 }
}

// «Elige 1», «Ordena tus 3»; con máximo mayor que 1, «Elige 1 a 3 · 2/3» (el contador solo en ese caso).
export function indicadorEleccion(eleccion: EleccionPublica, elegidas: number, podio = false) {
  if (podio) return `Ordena tus ${eleccion.maxima}`
  if (eleccion.maxima <= 1) return 'Elige 1'
  const minima = Math.max(1, eleccion.minima)
  const rango = minima === eleccion.maxima ? `${minima}` : `${minima} a ${eleccion.maxima}`
  return `Elige ${rango} · ${Math.min(elegidas, eleccion.maxima)}/${eleccion.maxima}`
}

// La pregunta sobre las opciones.
export const preguntaDeEleccion = (node: NodoConsigna, item: ItemRegistroPublico) =>
  node.preguntaEleccion ?? item.consigna

// Una opción que cierra el ítem sin seguimiento cambia la pregunta del texto: la suya o la genérica.
export function preguntaSinSeguimiento(item: ItemRegistroPublico, seleccion: OpcionElegida[]) {
  if (!cierraSinSeguimiento(item, seleccion)) return undefined
  const propia = (item.eleccion?.opciones_propias ?? []).find((o) => o.codigo === seleccion[0].codigo)
  return propia?.pregunta_propia || PREGUNTA_SIN_SEGUIMIENTO
}

export const ENTRADA_LIBRE = 'Escribe aquí…'

// El placeholder del campo: el de la opción propia elegida sola, si lo declara; si la opción cambió la pregunta del
// campo y no declara el suyo, uno libre (la entrada del ítem ya no encaja); si no, la entrada del ítem.
export function entradaVigente(node: NodoConsigna, seleccion: OpcionElegida[] = [], cambiaPregunta = false) {
  const propia = seleccion.length === 1 ? node.entradaPropia?.[seleccion[0].codigo] : undefined
  if (propia) return propia
  if (cambiaPregunta) return ENTRADA_LIBRE
  return node.entrada ?? node.placeholder ?? ENTRADA_POR_DEFECTO
}
