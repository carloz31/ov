import { obtener } from './cliente'
import type { ReferenciasConsultadas, RespuestaServidor } from '@/types/servidor'

export function obtenerReferencias(
  cuenta: string,
  actividad: string,
): Promise<RespuestaServidor<ReferenciasConsultadas>> {
  return obtener(
    `/cuentas/${encodeURIComponent(cuenta)}/actividades/${encodeURIComponent(actividad)}/referencias`,
  )
}
