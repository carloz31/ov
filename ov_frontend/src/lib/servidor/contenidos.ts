import { contenidoPorClave } from '@/data/activities/contenidos.ts'
import { configureStudentActivities } from '@/data/activities/reflectionConfig'
import type { Actividad } from '@/types/activities'
import type { BloqueActividades, ItemPublico } from '@/types/servidor'
import { bloquesZona } from './adaptadores'

export function actividadPorContenido(
  bloques: BloqueActividades[] | null,
  codigo: string,
): Actividad | undefined {
  const actividad = bloques?.flatMap((b) => b.actividades).find((a) => a.codigo === codigo)
  const contenido = actividad && contenidoPorClave(actividad.contenido)
  // Sin nodos, el contenido solo ubica el punto en el mapa: no hay actividad que abrir.
  if (!actividad || !contenido?.nodos.length) return undefined
  const { mapa: _mapa, ...narrativa } = contenido
  // Conserva los ajustes narrativos que ya usa el reproductor local.
  return { ...configureStudentActivities([narrativa])[0], id: actividad.codigo, titulo: actividad.titulo }
}

// Cuestionario cuyo contenido trae un nodo `item` con itemId "plantilla": ese nodo se repite
// con los ítems del servidor, en su orden, entre los diálogos de entrada y de cierre del contenido.
export const plantillaCuestionario = (contenido: Actividad) =>
  contenido.nodos.find((n) => n.tipo === 'item' && n.itemId === 'plantilla')
export function cuestionarioServidor(contenido: Actividad, items: ItemPublico[]): Actividad {
  return {
    ...contenido,
    nodos: contenido.nodos.flatMap((nodo) =>
      nodo.tipo === 'item' && nodo.itemId === 'plantilla'
        ? [...items]
            .sort((a, b) => a.orden - b.orden)
            .map((item) => ({
              ...nodo,
              id: `${contenido.id}-${item.codigo}`,
              instrumentoId: item.instrumento,
              itemId: item.codigo,
            }))
        : [nodo],
    ),
  }
}

export function progresoBloque(bloques: BloqueActividades[] | null, codigo = 'CAMINO') {
  // Como el servidor, el avance cuenta solo las actividades requeridas.
  const actividades = bloquesZona(bloques, codigo)
    .flatMap((b) => b.actividades)
    .filter(
      (a) =>
        a.visible &&
        a.visibilidad === 'SIEMPRE' &&
        a.requerida !== false &&
        !!contenidoPorClave(a.contenido)?.mapa,
    )
  const completadas = actividades.filter((a) => a.estado === 'COMPLETADA').length
  return {
    completadas,
    total: actividades.length,
    porcentaje: actividades.length ? (completadas / actividades.length) * 100 : 0,
  }
}

function listaApoderado(bloques: BloqueActividades[] | null) {
  return bloques?.filter((b) => b.espacio === 'PORTAL_FAMILIA').flatMap((b) => b.actividades) ?? []
}

export function actividadesApoderado(bloques: BloqueActividades[] | null) {
  const actividades: Actividad[] = [],
    sinContenido: string[] = []
  listaApoderado(bloques).forEach((actividad, indice) => {
    if (!actividad.visible) return
    const contenido = contenidoPorClave(actividad.contenido)
    if (!contenido) {
      sinContenido.push(actividad.codigo)
      return
    }
    const { mapa: _mapa, ...narrativa } = contenido
    actividades.push({
      ...narrativa,
      id: actividad.codigo,
      titulo: actividad.titulo,
      orden: indice + 1,
      requisitos: [],
    })
  })
  return { actividades, sinContenido }
}

export function disponiblesApoderado(bloques: BloqueActividades[] | null): Set<string> {
  return new Set(
    listaApoderado(bloques)
      // Un contenido sin nodos (t_apo_carta hasta F08) se lista, pero no se puede iniciar.
      .filter((a) => a.visible && !!contenidoPorClave(a.contenido)?.nodos.length && a.estado !== 'BLOQUEADA')
      .map((a) => a.codigo),
  )
}

export function completadasApoderado(bloques: BloqueActividades[] | null): string[] {
  return listaApoderado(bloques)
    .filter((a) => a.visible && contenidoPorClave(a.contenido) && a.estado === 'COMPLETADA')
    .map((a) => a.codigo)
}
