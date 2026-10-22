import { useSyncExternalStore } from 'react'

// F04d: qué recurso muestra el visor de la mochila encima de la pantalla actual. Las actividades lo abren con
// `abrirRecurso` (una función, sin contexto: sirve también en el arnés de las pruebas locales) y el visor del
// portal del estudiante lo dibuja sin navegar.
export type ModoVisor = 'mochila' | 'repaso'
export type RecursoAbierto = { codigo: string; modo: ModoVisor } | null

let abierto: RecursoAbierto = null
const oyentes = new Set<() => void>()
function publicar(siguiente: RecursoAbierto) {
  abierto = siguiente
  oyentes.forEach((oyente) => oyente())
}
export const abrirRecurso = (codigo: string, modo: ModoVisor = 'mochila') => publicar({ codigo, modo })
export const cerrarRecurso = () => publicar(null)
export const obtenerRecursoAbierto = () => abierto
const suscribir = (oyente: () => void) => {
  oyentes.add(oyente)
  return () => {
    oyentes.delete(oyente)
  }
}
export const useRecursoAbierto = () => useSyncExternalStore(suscribir, obtenerRecursoAbierto)
