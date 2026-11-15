import type { DetalleError } from '@/types/servidor'

export type ActividadRuta = { id: string; titulo: string; duracionEstimadaMin: number }

export type AvanceApertura = {
  // Título de la actividad que abre la sección; nulo si el bloqueo no la nombra (se usa el texto de siempre).
  apertura: string | null
  completadas: number
  total: number
  siguiente: { titulo: string; minutos: number } | null
}

// Ajuste desbloqueos: la actividad que abre Conversaciones sale de la regla de la sección, en el 409 que ya está en el
// almacén (la condición COMPLETA_ACTIVIDAD de su regla), no de un código fijo.
export function actividadApertura(detalle: DetalleError | undefined): string | null {
  for (const regla of detalle?.progreso?.reglas ?? []) {
    const condicion = regla.condiciones.find((c) => c.tipo_evento === 'COMPLETA_ACTIVIDAD' && c.referencia)
    if (condicion?.referencia) return condicion.referencia
  }
  return null
}

// El avance cuenta solo hasta la actividad que abre la sección (con p4, «N de 4»); sin ella, toda la ruta.
export function avanceApertura(
  actividades: ActividadRuta[],
  completadas: string[],
  codigo: string | null,
  avanceRuta?: { completadas: number; total: number },
): AvanceApertura {
  const tope = codigo ? actividades.findIndex((a) => a.id === codigo) : -1
  const tramo = tope >= 0 ? actividades.slice(0, tope + 1) : actividades
  const siguiente = tramo.find((a) => !completadas.includes(a.id))
  return {
    apertura: tope >= 0 ? actividades[tope].titulo : null,
    completadas:
      tope >= 0 ? tramo.filter((a) => completadas.includes(a.id)).length : avanceRuta?.completadas ?? completadas.length,
    total: tope >= 0 ? tramo.length : avanceRuta?.total ?? actividades.length,
    siguiente: siguiente ? { titulo: siguiente.titulo, minutos: siguiente.duracionEstimadaMin } : null,
  }
}
