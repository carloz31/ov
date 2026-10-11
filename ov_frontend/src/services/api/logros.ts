import { obtener } from './cliente'
import type { LogrosCuenta, RespuestaServidor } from '@/types/servidor'

export function obtenerLogros(cuenta: string): Promise<RespuestaServidor<LogrosCuenta>> {
  return obtener(`/cuentas/${encodeURIComponent(cuenta)}/logros`)
}
