import { obtener } from './cliente'
import type { CasoCuenta, OcupacionColeccion, RespuestaServidor } from '@/types/servidor'

export function obtenerCasos(cuenta: string): Promise<RespuestaServidor<CasoCuenta[]>> {
  return obtener(`/cuentas/${encodeURIComponent(cuenta)}/casos`)
}

export function obtenerColeccion(cuenta: string): Promise<RespuestaServidor<OcupacionColeccion[]>> {
  return obtener(`/cuentas/${encodeURIComponent(cuenta)}/coleccion`)
}
