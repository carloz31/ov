import { NODOS_PERMITIDOS, type Actividad } from '@/types/activities'

export function validateActivity(activity: Actividad) {
  if (activity.audiencia === 'apoderado' && activity.tipo !== 'encuentro')
    throw new Error(`El apoderado solo admite encuentros: ${activity.id}`)
  if (activity.nodos.some((node) => !NODOS_PERMITIDOS[activity.tipo].includes(node.tipo)))
    throw new Error(`Nodos incompatibles en ${activity.id}`)
  for (const node of activity.nodos) {
    if (node.tipo !== 'diapositiva') continue
    for (const block of node.bloques) {
      if (
        block.tipo === 'tabla' &&
        (!block.columnas.length || block.filas.some((row) => row.length !== block.columnas.length))
      )
        throw new Error(`Tabla incompatible en ${activity.id}/${node.id}`)
    }
  }
}
