import { contenidoPorClave } from '@/data/activities/contenidos.ts'
import { mensajeBloqueo } from '@/lib/servidor/adaptadores'
import { appPaths } from '@/routes/paths'
import type { ActividadCuenta, BloqueActividades } from '@/types/servidor'
import type { PointDetails } from './pointDetails'
import type { StudentMapPoint } from './mapPoints'
import { duracionActividad, tipoActividad } from './etiquetaActividad'

// Actividades del servidor sin marcador propio del front: todo lo que se muestra sale del servidor;
// del contenido solo cuenta si tiene nodos.
export function detallesRuta(
  point: StudentMapPoint,
  actividad: ActividadCuenta,
  badge: string,
  bloques: BloqueActividades[] | null,
): PointDetails | undefined {
  const region = bloques?.find((b) => b.actividades.some((a) => a.codigo === actividad.codigo))?.nombre ?? ''
  const contenido = contenidoPorClave(actividad.contenido)
  if (!contenido) return undefined
  // Un contenido sin nodos solo da la posición: su lote F lo completa. Batallas y casos apuntan a su
  // desafío o caso del front (F04).
  const pendiente =
    !contenido.nodos.length && !contenido.desafio && !contenido.caso && point.status === 'available'
  const tipo = tipoActividad(actividad)
  return {
    title: point.title,
    region,
    badge: pendiente ? 'Contenido pendiente' : badge,
    opcional: !actividad.requerida,
    meta: duracionActividad(actividad),
    type: tipo,
    // La presentación de la actividad la da el servidor; el contenido no la repite.
    description: actividad.descripcion ?? '',
    requirement: point.status === 'locked' ? mensajeBloqueo(bloques, actividad.codigo) : undefined,
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
    // Un caso se juega en la Central de Casos.
    ...(actividad.tipo === 'CASO' && contenido.caso ? { href: appPaths.student.case(contenido.caso) } : {}),
    revision: point.status === 'completed',
  }
}
