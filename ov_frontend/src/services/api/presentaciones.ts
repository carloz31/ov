import { enviar, obtener } from './cliente'
import type { PresentacionesCuenta, RespuestaServidor } from '@/types/servidor'

export function obtenerPresentaciones(cuenta: string): Promise<RespuestaServidor<PresentacionesCuenta>> {
  return obtener(`/cuentas/${encodeURIComponent(cuenta)}/presentaciones`)
}

// Ajuste presentaciones-vistas: idempotente; responde todas las vistas ya cerradas.
export function enviarPresentacionVista(
  cuenta: string,
  codigo: string,
): Promise<RespuestaServidor<PresentacionesCuenta>> {
  return enviar('/acciones/presentacion-vista', { cuenta, codigo })
}
