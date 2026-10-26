import { obtener } from './cliente'
import type { AvanceEstudiante, RespuestaServidor } from '@/types/servidor'

export function obtenerAvance(cuenta: string): Promise<RespuestaServidor<AvanceEstudiante>> {
  return obtener(`/cuentas/${encodeURIComponent(cuenta)}/avance`)
}
