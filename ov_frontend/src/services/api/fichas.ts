import { obtener } from './cliente'
import type { FichaCuenta, RespuestaServidor } from '@/types/servidor'

export function obtenerFichas(cuenta: string): Promise<RespuestaServidor<FichaCuenta[]>> {
  return obtener(`/cuentas/${encodeURIComponent(cuenta)}/fichas`)
}
