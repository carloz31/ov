import { desarrollo } from '@/config/env'
import { bloquesZona, mensajeBloqueo } from '@/lib/servidor/adaptadores'
import type { ActividadCuenta, BloqueActividades } from '@/types/servidor'
import type { StudentMapPoint } from './mapPoints'
import { getListedActivities, getPointMapHref } from './navigation'

// Solo api: el «Siguiente paso» del inicio, el panel plegado y el pulso del mapa.
export type SiguientePaso =
  | {
      estado: 'disponible' | 'empezada' | 'bloqueada'
      punto: StudentMapPoint
      mensaje?: string
      // La actividad está en la otra zona: se abre en su mapa.
      href?: string
    }
  | { estado: 'completado' | 'recorrido' }

const avisadas = new Set<string>()
const puntoDe = (actividad: ActividadCuenta, puntos: StudentMapPoint[]) =>
  puntos.find(
    (p) =>
      p.presentacionServidor &&
      (p.specActivityId === actividad.codigo || p.secuencia?.some((a) => a.codigo === actividad.codigo)),
  )

// Prioridad: una requerida empezada; si no, la primera disponible; si no, la primera bloqueada.
// Orden de la ruta del servidor: Camino (T0, T1, T2) y luego Ciudad.
export function siguientePaso(
  bloques: BloqueActividades[] | null,
  puntos: StudentMapPoint[],
  zona: StudentMapPoint['zone'],
): SiguientePaso | null {
  if (!bloques) return null
  const requeridas = [...bloquesZona(bloques, 'CAMINO'), ...bloquesZona(bloques, 'CIUDAD')]
    .flatMap((b) => b.actividades)
    .filter((a) => a.requerida && a.estado !== 'COMPLETADA')
    .flatMap((actividad) => {
      const punto = puntoDe(actividad, puntos)
      // Por diseño no deberían existir: una requerida oculta o sin contenido en el front.
      if (!punto && desarrollo && !avisadas.has(actividad.codigo)) {
        avisadas.add(actividad.codigo)
        console.warn(`Siguiente paso: la requerida ${actividad.codigo} no está en el mapa y se omite.`)
      }
      return punto ? [{ actividad, punto }] : []
    })
  const elegida =
    requeridas.find((r) => r.actividad.estado === 'EN_CURSO') ??
    requeridas.find((r) => r.actividad.estado === 'DISPONIBLE') ??
    requeridas.find((r) => r.actividad.estado === 'BLOQUEADA')
  if (!elegida) return { estado: getListedActivities(puntos, false).length ? 'completado' : 'recorrido' }
  const { actividad, punto } = elegida
  return {
    estado:
      actividad.estado === 'EN_CURSO'
        ? 'empezada'
        : actividad.estado === 'BLOQUEADA'
          ? 'bloqueada'
          : 'disponible',
    punto,
    ...(actividad.estado === 'BLOQUEADA' ? { mensaje: mensajeBloqueo(bloques, actividad.codigo) } : {}),
    ...(punto.zone !== zona ? { href: getPointMapHref(punto) } : {}),
  }
}

// Visibles en DISPONIBLE o EN_CURSO (las que lista «Mis actividades»), sin la del botón.
export const actividadesMas = (puntos: StudentMapPoint[], paso: SiguientePaso | null) =>
  paso ? getListedActivities(puntos, false).filter((p) => !('punto' in paso) || p !== paso.punto).length : 0
