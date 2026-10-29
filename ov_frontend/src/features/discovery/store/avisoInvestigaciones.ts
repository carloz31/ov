import { useSyncExternalStore } from 'react'

// F09: el toast de Investigaciones (publicar, reacción, favorito, reporte, retirar, cancelar, errores). Vive fuera
// de las vistas para que sobreviva a la navegación (publicar lleva al detalle, cancelar se queda en el listado).
export type AvisoInvestigacion = { id: number; titulo: string; descripcion?: string; error?: boolean }
let aviso: AvisoInvestigacion | null = null
let siguiente = 1
const oyentes = new Set<() => void>()
const avisar = () => oyentes.forEach((oyente) => oyente())

export function mostrarAvisoInvestigacion(titulo: string, descripcion?: string, error = false) {
  aviso = { id: siguiente++, titulo, descripcion, error }
  avisar()
}
export function cerrarAvisoInvestigacion() {
  aviso = null
  avisar()
}
export function useAvisoInvestigacion() {
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
