import { obtener } from './cliente'
import type { RespuestaServidor, SeccionEstado } from '@/types/servidor'

export function obtenerSecciones(cuenta: string): Promise<RespuestaServidor<SeccionEstado[]>> {
  return obtener(`/cuentas/${encodeURIComponent(cuenta)}/secciones`)
}
