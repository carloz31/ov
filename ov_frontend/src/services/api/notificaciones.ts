import { enviar, obtener } from './cliente'
import type { NotificacionesMarcadas, PaginaNotificaciones, RespuestaServidor } from '@/types/servidor'

// Ajuste notificaciones: la campana, de la más reciente a la más antigua.
export function obtenerNotificaciones(
  cuenta: string,
  desde = 0,
  limite = 20,
): Promise<RespuestaServidor<PaginaNotificaciones>> {
  return obtener(`/cuentas/${encodeURIComponent(cuenta)}/notificaciones?limite=${limite}&desde=${desde}`)
}

// Idempotente; sin códigos, todas las pendientes.
export function marcarNotificacionesVistas(
  cuenta: string,
  codigos: string[],
): Promise<RespuestaServidor<NotificacionesMarcadas>> {
  return enviar(`/cuentas/${encodeURIComponent(cuenta)}/notificaciones/marcar-vistas`, { codigos })
}
