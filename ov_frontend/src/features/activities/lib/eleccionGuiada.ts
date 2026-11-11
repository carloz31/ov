import type { OpcionElegida } from '@/types/servidor'
import { esOtra } from '@/lib/servidor/adaptadoresRegistro'

// Elección de un ítem de registro (F01; ajuste front de registros, lote 1). Lógica pura.
export type ReglasEleccion = { maxima: number; exclusivas: string[] }

// Tocar alterna. Una exclusiva quita las demás y elegir otra quita la exclusiva. Con máxima 1, tocar
// otra reemplaza la elegida (radio); con el máximo alcanzado, una más no reemplaza. Lo marcado guarda el orden en
// que se tocó (el de una elección ordenada).
export function alternar(seleccion: OpcionElegida[], codigo: string, reglas: ReglasEleccion): OpcionElegida[] {
  const nueva: OpcionElegida = esOtra(codigo) ? { codigo, texto: '' } : { codigo }
  if (seleccion.some((o) => o.codigo === codigo)) return seleccion.filter((o) => o.codigo !== codigo)
  if (reglas.exclusivas.includes(codigo)) return [nueva]
  if (reglas.maxima === 1) return [nueva]
  const base = seleccion.filter((o) => !reglas.exclusivas.includes(o.codigo))
  if (base.length >= reglas.maxima) return seleccion
  return [...base, nueva]
}

export function conTextoOtra(seleccion: OpcionElegida[], texto: string): OpcionElegida[] {
  return seleccion.map((o) => (esOtra(o.codigo) ? { codigo: o.codigo, texto } : o))
}
