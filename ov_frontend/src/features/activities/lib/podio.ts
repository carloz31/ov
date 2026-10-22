import type { ItemRegistroPublico } from '@/types/servidor'

// Podio de «elegir y ordenar top N» (F01): lógica pura, sin React. Un puesto vacío es null.
// Se usa en toda elección ordenada de lista propia o común con N fijo (mínima = máxima) y sin «otra».
export const esTopN = (item: ItemRegistroPublico) =>
  !!item.eleccion &&
  item.eleccion.ordenada &&
  item.eleccion.minima === item.eleccion.maxima &&
  item.eleccion.maxima > 1 &&
  !item.eleccion.permite_otra &&
  !item.eleccion.referencia
export type Puestos = (string | null)[]

export function puestosDesde(seleccion: string[], n: number): Puestos {
  return Array.from({ length: n }, (_, i) => seleccion[i] ?? null)
}
export function seleccionDe(puestos: Puestos): string[] {
  return puestos.filter((p): p is string => p !== null)
}
export const completo = (puestos: Puestos) => puestos.every((p) => p !== null)
export const faltan = (puestos: Puestos) => puestos.filter((p) => p === null).length

// Tocar una ficha la coloca en el primer puesto libre; si no hay, no cambia nada.
export function colocar(puestos: Puestos, codigo: string): Puestos {
  const libre = puestos.indexOf(null)
  if (libre < 0 || puestos.includes(codigo)) return puestos
  return puestos.map((p, i) => (i === libre ? codigo : p))
}
// Tocar un puesto ocupado devuelve la ficha a la grilla.
export function quitar(puestos: Puestos, indice: number): Puestos {
  return puestos.map((p, i) => (i === indice ? null : p))
}
// Arrastrar un puesto sobre otro intercambia ambos (también con uno vacío).
export function intercambiar(puestos: Puestos, a: number, b: number): Puestos {
  if (a === b) return puestos
  const siguiente = [...puestos]
  ;[siguiente[a], siguiente[b]] = [siguiente[b], siguiente[a]]
  return siguiente
}

const NUMEROS = ['cero', 'uno', 'dos', 'tres', 'cuatro', 'cinco', 'seis', 'siete', 'ocho', 'nueve', 'diez']
export const enPalabras = (n: number) => NUMEROS[n] ?? String(n)

export type UnidadPodio = { singular: string; plural: string }
export function mensajeLumi(puestos: Puestos, unidad: UnidadPodio) {
  const pendientes = faltan(puestos)
  if (pendientes === puestos.length)
    return `Arma tu podio: toca los ${enPalabras(puestos.length)} ${unidad.plural} que más te importan, empezando por el primero.`
  if (pendientes === 0) return '¡Tu podio está listo! Ahora cuéntame por qué elegiste tu primer lugar.'
  return pendientes === 1
    ? `Bien. Te falta 1 ${unidad.singular}.`
    : `Bien. Te faltan ${pendientes} ${unidad.plural}.`
}
// «¿Por qué «{opcion}» es lo más importante para ti?»
export const preguntaPrimero = (plantilla: string, opcion: string) => plantilla.replace('{opcion}', opcion)
