import { contenidoPorClave } from '@/data/activities/contenidos.ts'
import { baseRoute } from '@/data/activities/reflectionConfig'
import { estadoPunto } from '@/lib/servidor/adaptadores'
import { avisarContenidoFaltante } from '@/store/servidor/contenidos'
import type { ActividadCuenta, BloqueActividades } from '@/types/servidor'
import type { StudentMapPoint } from './mapPoints'
import { iconosMapa } from './iconosMapa'

// Identidad de los marcadores ya existentes; la lista y el orden vienen del servidor.
export function idPuntoContenido(clave: string, codigo: string) {
  const contenido = contenidoPorClave(clave)
  return (
    baseRoute.find(([, id]) => id === contenido?.id)?.[0] ??
    (clave === 'instrumento_mara'
      ? 'mara-test'
      : clave === 'encuentro_resultado_elena'
        ? 'elena-result'
        : codigo)
  )
}

export function puntosServidor(
  bloques: BloqueActividades[] | null,
  codigo: string,
  zone: StudentMapPoint['zone'],
): StudentMapPoint[] {
  const bloque = bloques?.find((b) => b.codigo === codigo)
  const grupos: ActividadCuenta[][] = []
  for (const actividad of bloque?.actividades ?? []) {
    const grupo = grupos.at(-1)
    if (grupo?.[0].contenido === actividad.contenido) grupo.push(actividad)
    else grupos.push([actividad])
  }
  const ids = new Set<string>()
  return grupos.flatMap((grupo) => {
    const contenido = contenidoPorClave(grupo[0].contenido)
    if (!contenido) {
      grupo.forEach((a) => avisarContenidoFaltante(a.codigo, a.contenido))
      return []
    }
    const visibles = grupo.filter((a) => a.visible)
    if (!visibles.length || !contenido.mapa) return []
    const actividad = visibles.find((a) => a.estado !== 'COMPLETADA') ?? visibles.at(-1)!
    const mapa = contenido.mapa
    const original = idPuntoContenido(actividad.contenido, actividad.codigo)
    const id = ids.has(original) ? actividad.codigo : original
    ids.add(id)
    return [
      {
        id,
        title: actividad.titulo,
        x: mapa.x,
        y: mapa.y,
        subtitle:
          grupo.length > 1
            ? `Test · Interacción ${grupo.indexOf(actividad) + 1} de ${grupo.length}`
            : (mapa.etiqueta ?? ''),
        icon: iconosMapa[mapa.icono],
        status: estadoPunto(actividad),
        zone,
        bloque: bloque!.numero,
        specActivityId: actividad.codigo,
        actionEnabled:
          actividad.contenido !== 'encuentro_resultado_elena' || actividad.estado !== 'BLOQUEADA',
        ...(grupo.length > 1 ? { secuencia: grupo } : {}),
      },
    ]
  })
}
