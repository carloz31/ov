import { obtener } from './cliente'
import type { BloqueActividades, RespuestaServidor } from '@/types/servidor'

export function obtenerActividades(cuenta: string): Promise<RespuestaServidor<BloqueActividades[]>> {
  return obtener(`/cuentas/${encodeURIComponent(cuenta)}/actividades`)
}
