import type { EleccionItem } from '@/types/servidor'
import { PIE_REGISTRO } from './textosRegistro'

// Ajuste vista del ítem de registro: cómo se presenta un ítem. Lógica pura. Ajuste front de registros (lote 1): la
// consigna viene del servidor y la elección va siempre antes del texto.

export const LEYENDA_ITEM = PIE_REGISTRO
export const ENTRADA_POR_DEFECTO = 'Escribe con tus palabras, no hay respuestas incorrectas'

// «Elige 1», «Ordena tus 3»; con máximo mayor que 1, «Elige 1 a 3 · 2/3» (el contador solo en ese caso).
export function indicadorEleccion(eleccion: EleccionItem, elegidas: number, podio = false) {
  if (podio) return `Ordena tus ${eleccion.maxima}`
  if (eleccion.maxima <= 1) return 'Elige 1'
  const minima = Math.max(1, eleccion.minima)
  const rango = minima === eleccion.maxima ? `${minima}` : `${minima} a ${eleccion.maxima}`
  return `Elige ${rango} · ${Math.min(elegidas, eleccion.maxima)}/${eleccion.maxima}`
}
