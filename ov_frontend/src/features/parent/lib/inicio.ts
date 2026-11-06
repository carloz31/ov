import type { ConversacionesCuenta, CuestionarioHijo, ErrorServidor } from '@/types/servidor'

// Ajuste inicio-apoderado: lo que el Inicio del apoderado (api) deriva del servidor, sin estado propio. Solo
// importa tipos.

// La tarjeta «Conversaciones con {hijo}»: un estado por vez (boceto C), leído de la sección del hijo elegido.
export type EstadoConversaciones =
  | { tipo: 'cargando' }
  | { tipo: 'bloqueada'; mensaje: string }
  | { tipo: 'carta' }
  | { tipo: 'te_toca'; completadas: number; total: number; esperan: number }
  | { tipo: 'en_curso'; completadas: number; total: number }
  | { tipo: 'completas'; total: number }
  | { tipo: 'error' }

export function estadoConversaciones(seccion: {
  datos: ConversacionesCuenta | null
  error: ErrorServidor | null
}): EstadoConversaciones {
  const { datos, error } = seccion
  // La sección cerrada responde 409 con su mensaje de bloqueo; cualquier otro error es de carga.
  if (error?.tipo === 'bloqueado')
    return { tipo: 'bloqueada', mensaje: error.detalle.mensaje ?? 'Las conversaciones todavía no están abiertas.' }
  if (error) return { tipo: 'error' }
  if (!datos) return { tipo: 'cargando' }
  if (datos.carta_pendiente) return { tipo: 'carta' }
  const { completadas, total } = datos
  if (total > 0 && completadas === total) return { tipo: 'completas', total }
  const esperan = datos.conversaciones.filter((c) => c.estado === 'te_toca').length
  return esperan ? { tipo: 'te_toca', completadas, total, esperan } : { tipo: 'en_curso', completadas, total }
}

// Un chip por aplicación: UNICA «Completado · fecha» o «Aún no lo completa»; ENTRADA y SALIDA, «Partida» y
// «Llegada», con fecha o «pendiente». La fecha llega formateada por `fecha`.
export type ChipCuestionario = { completado: boolean; texto: string }
export function chipsCuestionario(cuestionario: CuestionarioHijo, fecha: (valor: string) => string): ChipCuestionario[] {
  return cuestionario.aplicaciones.map(({ momento, completado_en }) => {
    if (momento === 'UNICA')
      return completado_en
        ? { completado: true, texto: `Completado · ${fecha(completado_en)}` }
        : { completado: false, texto: 'Aún no lo completa' }
    const nombre = momento === 'ENTRADA' ? 'Partida' : 'Llegada'
    return completado_en
      ? { completado: true, texto: `${nombre} · ${fecha(completado_en)}` }
      : { completado: false, texto: `${nombre} pendiente` }
  })
}

export const tieneResultado = (cuestionario: CuestionarioHijo) =>
  cuestionario.aplicaciones.some((a) => a.completado_en !== null)
