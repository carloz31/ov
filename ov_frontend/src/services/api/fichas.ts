import { obtener } from './cliente'
import type { ContenidoEstado, RespuestaServidor } from '@/types/servidor'

export function obtenerFichas(cuenta: string): Promise<RespuestaServidor<ContenidoEstado[]>> {
  return obtener(`/cuentas/${encodeURIComponent(cuenta)}/fichas`)
}
