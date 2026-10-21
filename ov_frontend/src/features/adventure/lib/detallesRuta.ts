import { contenidoPorClave } from '@/data/activities/contenidos.ts'
import type { ActividadCuenta } from '@/types/servidor'
import type { PointDetails } from './pointDetails'
import type { StudentMapPoint } from './mapPoints'

const tipos: Record<ActividadCuenta['tipo'], string> = {
  INFORMATIVA: 'Informativa',
  REGISTRO: 'Registro',
  CUESTIONARIO: 'Test',
  CASO: 'Caso',
  BATALLA: 'Batalla',
}

// Actividades del servidor sin marcador propio del front: los textos salen del servidor y del contenido.
export function detallesRuta(
  point: StudentMapPoint,
  actividad: ActividadCuenta,
  badge: string,
  region: string,
): PointDetails | undefined {
  const contenido = contenidoPorClave(actividad.contenido)
  if (!contenido) return undefined
  // Un contenido sin nodos solo da la posición: su lote F lo completa.
  const pendiente = !contenido.nodos.length && point.status === 'available'
  const tipo = tipos[actividad.tipo]
  return {
    title: point.title,
    region: contenido.ubicacion ?? region,
    badge: pendiente ? 'Contenido pendiente' : badge,
    meta: `${actividad.duracion_estimada_min ?? contenido.duracionEstimadaMin} min`,
    type: tipo,
    description: actividad.descripcion ?? contenido.subtitulo ?? '',
    requirement: point.status === 'locked' ? 'Consultando el requisito en el servidor…' : undefined,
    actionLabel: pendiente
      ? 'Contenido pendiente'
      : point.status === 'locked'
        ? 'Actividad bloqueada'
        : point.status === 'completed'
          ? tipo === 'Informativa'
            ? 'Volver a realizar esta misión'
            : 'Ver o modificar mis respuestas'
          : actividad.estado === 'EN_CURSO'
            ? 'Continuar actividad'
            : 'Iniciar actividad',
    disabled: pendiente || point.status === 'locked',
    activityId: point.specActivityId,
    revision: point.status === 'completed',
  }
}
