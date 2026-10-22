import { contenidoPorClave } from '@/data/activities/contenidos.ts'
import { configureStudentActivities } from '@/data/activities/reflectionConfig'
import type { Actividad } from '@/types/activities'
import type { BloqueActividades, ItemPublico, ItemRegistroPublico } from '@/types/servidor'
import { bloquesZona } from './adaptadores'

export function actividadPorContenido(
  bloques: BloqueActividades[] | null,
  codigo: string,
): Actividad | undefined {
  const bloque = bloques?.find((b) => b.actividades.some((a) => a.codigo === codigo))
  const actividad = bloque?.actividades.find((a) => a.codigo === codigo)
  const contenido = actividad && contenidoPorClave(actividad.contenido)
  // Sin nodos, el contenido solo ubica el punto en el mapa: no hay actividad que abrir.
  if (!actividad || !contenido?.nodos.length) return undefined
  const { mapa: _mapa, ...narrativa } = contenido
  // Conserva los ajustes narrativos que ya usa el reproductor local.
  // El encabezado del reproductor y el cierre muestran el título y el bloque del servidor.
  return {
    ...configureStudentActivities([narrativa])[0],
    id: actividad.codigo,
    titulo: actividad.titulo,
    ubicacion: bloque!.nombre,
    duracionEstimadaMin: actividad.duracion_estimada_min ?? narrativa.duracionEstimadaMin,
  }
}

// F04: BATALLA y CASO se abren según su tipo, no según su bloque. Basta que el servidor la muestre
// y no la tenga bloqueada; no hace falta que la Ciudad esté abierta.
export type ReproductorTipo =
  | { tipo: 'desafio'; actividad: string; desafio: string }
  | { tipo: 'caso'; actividad: string; caso: string }
export function reproductorPorTipo(
  bloques: BloqueActividades[] | null,
  codigo: string,
): ReproductorTipo | undefined {
  const actividad = bloques?.flatMap((b) => b.actividades).find((a) => a.codigo === codigo)
  const contenido = actividad && contenidoPorClave(actividad.contenido)
  if (!actividad || !contenido || !actividad.visible || actividad.estado === 'BLOQUEADA') return undefined
  if (actividad.tipo === 'BATALLA' && contenido.desafio)
    return { tipo: 'desafio', actividad: codigo, desafio: contenido.desafio }
  if (actividad.tipo === 'CASO' && contenido.caso) return { tipo: 'caso', actividad: codigo, caso: contenido.caso }
  return undefined
}
// Actividad CASO del servidor que juega el caso `caso` del front, si la cuenta puede abrirla.
export function actividadDeCaso(bloques: BloqueActividades[] | null, caso: string) {
  return (bloques ?? [])
    .flatMap((b) => b.actividades)
    .map((a) => reproductorPorTipo(bloques, a.codigo))
    .find((r) => r?.tipo === 'caso' && r.caso === caso)?.actividad
}
// Desafíos y casos del front que ya representa una actividad del servidor.
export function referenciasServidor(bloques: BloqueActividades[] | null) {
  const contenidos = (bloques ?? []).flatMap((b) => b.actividades).map((a) => contenidoPorClave(a.contenido))
  return {
    desafios: new Set(contenidos.flatMap((c) => c?.desafio ?? [])),
    casos: new Set(contenidos.flatMap((c) => c?.caso ?? [])),
  }
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

// Registro del servidor: cada consigna con `item` responde ese ítem y muestra su consigna como premisa.
// Si un ítem no tiene consigna, o una consigna apunta a un ítem que no existe, no hay actividad que abrir.
export function registroServidor(contenido: Actividad, items: ItemRegistroPublico[]): Actividad | undefined {
  const consignas = contenido.nodos.filter((n) => n.tipo === 'consigna')
  const codigos = new Set(items.map((i) => i.codigo))
  if (
    consignas.some((n) => !n.item || !codigos.has(n.item)) ||
    items.some((i) => !consignas.some((n) => n.item === i.codigo))
  )
    return undefined
  return {
    ...contenido,
    nodos: contenido.nodos.map((nodo) => {
      const item = nodo.tipo === 'consigna' ? items.find((i) => i.codigo === nodo.item) : undefined
      return nodo.tipo === 'consigna' && item
        ? { ...nodo, premisa: item.consigna, obligatoria: item.obligatorio, entregable: { tipo: 'texto' as const } }
        : nodo
    }),
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
      // La presentación que muestran la tarjeta y el cierre es la del servidor.
      subtitulo: actividad.descripcion ?? undefined,
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
