import type { ItemRegistroCuenta } from '@/types/servidor'

// Podio de «elegir y ordenar top N» (F01): lógica pura, sin React. Un puesto vacío es null.
// Se usa en toda elección ordenada de lista propia o común con N fijo (mínima = máxima). Desde el lote 2 del ajuste
// front de registros, también con «Otra» (b2-4-bien): cada «Otra» ocupa un puesto.
export const esTopN = (item: ItemRegistroCuenta) =>
  !!item.eleccion &&
  item.eleccion.ordenada &&
  item.eleccion.minima === item.eleccion.maxima &&
  item.eleccion.maxima > 1
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

// El rótulo de un puesto que no es el primero: «2.º lugar», «3.er lugar».
export const rotuloPuesto = (indice: number) => (indice === 2 ? '3.er lugar' : `${indice + 1}.º lugar`)

const NUMEROS = ['cero', 'uno', 'dos', 'tres', 'cuatro', 'cinco', 'seis', 'siete', 'ocho', 'nueve', 'diez']
export const enPalabras = (n: number) => NUMEROS[n] ?? String(n)
