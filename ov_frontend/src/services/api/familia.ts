import { obtener } from './cliente'
import type { FamiliaApoderado, RespuestaServidor } from '@/types/servidor'

export function obtenerFamilia(cuenta: string): Promise<RespuestaServidor<FamiliaApoderado>> {
  return obtener(`/cuentas/${encodeURIComponent(cuenta)}/familia`)
}
