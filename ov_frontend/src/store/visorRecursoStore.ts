import { useSyncExternalStore } from 'react'

// F04d: qué recurso muestra el visor de la mochila encima de la pantalla actual. Las actividades lo abren con
// `abrirRecurso` (una función, sin contexto: sirve también en el arnés de las pruebas locales) y el visor del
// portal del estudiante lo dibuja sin navegar.
export type ModoVisor = 'mochila' | 'repaso'
// Ajustes Central (7): `testimonio` abre un testimonio (desde el cierre de la Central), no una ficha.
export type RecursoAbierto = { codigo: string; modo: ModoVisor; testimonio?: boolean } | null

let abierto: RecursoAbierto = null
const oyentes = new Set<() => void>()
function publicar(siguiente: RecursoAbierto) {
  abierto = siguiente
  oyentes.forEach((oyente) => oyente())
}
export const abrirRecurso = (codigo: string, modo: ModoVisor = 'mochila') => publicar({ codigo, modo })
export const abrirTestimonio = (codigo: string) => publicar({ codigo, modo: 'mochila', testimonio: true })
export const cerrarRecurso = () => publicar(null)
export const obtenerRecursoAbierto = () => abierto
const suscribir = (oyente: () => void) => {
  oyentes.add(oyente)
  return () => {
    oyentes.delete(oyente)
  }
}
export const useRecursoAbierto = () => useSyncExternalStore(suscribir, obtenerRecursoAbierto)

// Si hay una ficha (o su pop up de requisito) en pantalla. Mientras la haya, la ficha tiene prioridad sobre
// los avisos automáticos (como el tutorial de Lumi de la mochila), que aparecen al cerrarla.
let enPantalla = 0
const oyentesPantalla = new Set<() => void>()
const avisarPantalla = () => oyentesPantalla.forEach((oyente) => oyente())
export function registrarFichaEnPantalla() {
  enPantalla++
  avisarPantalla()
  return () => {
    enPantalla--
    avisarPantalla()
  }
}
export const hayFichaEnPantalla = () => enPantalla > 0
const suscribirPantalla = (oyente: () => void) => {
  oyentesPantalla.add(oyente)
  return () => {
    oyentesPantalla.delete(oyente)
  }
}
export const useFichaEnPantalla = () => useSyncExternalStore(suscribirPantalla, hayFichaEnPantalla)
