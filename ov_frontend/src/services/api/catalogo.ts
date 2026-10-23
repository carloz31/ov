import { obtener } from './cliente'
import type { OcupacionDetalle, RespuestaServidor } from '@/types/servidor'

export function obtenerOcupacion(cuenta: string, codigo: string): Promise<RespuestaServidor<OcupacionDetalle>> {
  return obtener(`/cuentas/${encodeURIComponent(cuenta)}/catalogo/ocupaciones/${encodeURIComponent(codigo)}`)
}
