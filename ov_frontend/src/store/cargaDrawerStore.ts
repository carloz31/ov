import { useSyncExternalStore } from 'react'

// Bloques del drawer de actividad que todavía piden sus datos (fichas de una batalla, ítems por ampliar,
// puntaje de un caso). El drawer muestra su skeleton hasta que no queda ninguno.
const pendientes = new Set<string>()
const oyentes = new Set<() => void>()

export function marcarCargaDrawer(clave: string, cargando: boolean) {
  const antes = pendientes.size
  if (cargando) pendientes.add(clave)
  else pendientes.delete(clave)
  if (pendientes.size !== antes) oyentes.forEach((oyente) => oyente())
}
function suscribir(oyente: () => void) {
  oyentes.add(oyente)
  return () => oyentes.delete(oyente)
}
export const useBloquesDrawerCargando = () => useSyncExternalStore(suscribir, () => pendientes.size > 0)
