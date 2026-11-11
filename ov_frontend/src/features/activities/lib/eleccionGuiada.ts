import type { OpcionElegida } from '@/types/servidor'
import { esOtra } from '@/lib/servidor/adaptadoresRegistro'

// Elección de un ítem de registro (F01; ajuste front de registros, lotes 1 y 2). Lógica pura.
export type ReglasEleccion = { maxima: number; exclusivas: string[] }

// Tocar alterna. Una exclusiva quita las demás y elegir otra quita la exclusiva. Con máxima 1, tocar
// otra reemplaza la elegida (radio); con el máximo alcanzado, una más no reemplaza. Lo marcado guarda el orden en
// que se tocó (el de una elección ordenada). Desmarcar una «Otra» borra su texto.
export function alternar(seleccion: OpcionElegida[], codigo: string, reglas: ReglasEleccion): OpcionElegida[] {
  const nueva: OpcionElegida = esOtra(codigo) ? { codigo, texto: '' } : { codigo }
  if (seleccion.some((o) => o.codigo === codigo)) return seleccion.filter((o) => o.codigo !== codigo)
  if (reglas.exclusivas.includes(codigo)) return [nueva]
  if (reglas.maxima === 1) return [nueva]
  const base = seleccion.filter((o) => !reglas.exclusivas.includes(o.codigo))
  if (base.length >= reglas.maxima) return seleccion
  return [...base, nueva]
}

// Lote 2 (§5): los códigos de «Otra» que admite el ítem: `OTRA` con una opción; `OTRA-1`…`OTRA-n` con varias.
export const codigosOtra = (maxima: number) =>
  maxima > 1 ? Array.from({ length: maxima }, (_, i) => `OTRA-${i + 1}`) : ['OTRA']

// La siguiente «Otra» libre, o nada si ya están todas.
export const siguienteOtra = (seleccion: OpcionElegida[], maxima: number) =>
  codigosOtra(maxima).find((c) => !seleccion.some((o) => o.codigo === c))

// Agrega una «Otra» (con su campo vacío), si queda una libre y no se llegó al máximo.
export function agregarOtra(seleccion: OpcionElegida[], reglas: ReglasEleccion): OpcionElegida[] {
  const codigo = siguienteOtra(seleccion, reglas.maxima)
  return codigo ? alternar(seleccion, codigo, reglas) : seleccion
}

// El texto de una «Otra», por su código (sin código, el de todas: compatibilidad con una sola «Otra»).
export function conTextoOtra(seleccion: OpcionElegida[], texto: string, codigo?: string): OpcionElegida[] {
  return seleccion.map((o) => (esOtra(o.codigo) && (!codigo || o.codigo === codigo) ? { codigo: o.codigo, texto } : o))
}
