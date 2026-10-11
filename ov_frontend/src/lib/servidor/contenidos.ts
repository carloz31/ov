import { contenidoPorClave } from '@/data/activities/contenidos.ts'
import { configureStudentActivities } from '@/data/activities/reflectionConfig'
import type { Actividad } from '@/types/activities'
import type { BloqueActividades } from '@/types/servidor'

export function actividadPorContenido(
  bloques: BloqueActividades[] | null,
  codigo: string,
): Actividad | undefined {
  const actividad = bloques?.flatMap((b) => b.actividades).find((a) => a.codigo === codigo)
  const contenido = actividad && contenidoPorClave(actividad.contenido)
  if (!actividad || !contenido) return undefined
  const { mapa: _mapa, ...narrativa } = contenido
  // Conserva los ajustes narrativos que ya usa el reproductor local.
  return { ...configureStudentActivities([narrativa])[0], id: actividad.codigo, titulo: actividad.titulo }
}

export function progresoBloque(bloques: BloqueActividades[] | null, codigo = 'CAMINO') {
  const actividades =
    bloques
      ?.find((b) => b.codigo === codigo)
      ?.actividades.filter(
        (a) => a.visible && a.visibilidad === 'SIEMPRE' && !!contenidoPorClave(a.contenido)?.mapa,
      ) ?? []
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
      .filter((a) => a.visible && contenidoPorClave(a.contenido) && a.estado !== 'BLOQUEADA')
      .map((a) => a.codigo),
  )
}

export function completadasApoderado(bloques: BloqueActividades[] | null): string[] {
  return listaApoderado(bloques)
    .filter((a) => a.visible && contenidoPorClave(a.contenido) && a.estado === 'COMPLETADA')
    .map((a) => a.codigo)
}
