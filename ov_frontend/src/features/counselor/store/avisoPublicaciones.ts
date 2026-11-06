import { useSyncExternalStore } from 'react'

// F09: el aviso de Publicaciones de la orientadora; sobrevive a volver de un detalle a la tabla (eliminar).
export type AvisoPublicacion = { id: number; titulo: string; descripcion?: string; error?: boolean }
let aviso: AvisoPublicacion | null = null
let siguiente = 1
const oyentes = new Set<() => void>()
const avisar = () => oyentes.forEach((oyente) => oyente())

export function mostrarAvisoPublicacion(titulo: string, descripcion?: string, error = false) {
  aviso = { id: siguiente++, titulo, descripcion, error }
  avisar()
}
export function cerrarAvisoPublicacion() {
  aviso = null
  avisar()
}
export function useAvisoPublicacion() {
  return useSyncExternalStore(
    (oyente) => {
      oyentes.add(oyente)
      return () => {
        oyentes.delete(oyente)
      }
    },
    () => aviso,
  )
}
