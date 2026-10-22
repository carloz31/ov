import { obtener } from './cliente'
import type { BatallaCuenta, RespuestaServidor } from '@/types/servidor'

export function obtenerBatallas(cuenta: string): Promise<RespuestaServidor<BatallaCuenta[]>> {
  return obtener(`/cuentas/${encodeURIComponent(cuenta)}/batallas`)
}
