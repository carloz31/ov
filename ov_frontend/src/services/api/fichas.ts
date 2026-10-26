import { obtener } from './cliente'
import type { FichaCuenta, FichaDetalle, RespuestaServidor } from '@/types/servidor'

export function obtenerFichas(cuenta: string): Promise<RespuestaServidor<FichaCuenta[]>> {
  return obtener(`/cuentas/${encodeURIComponent(cuenta)}/fichas`)
}

export function obtenerFicha(cuenta: string, codigo: string): Promise<RespuestaServidor<FichaDetalle>> {
  return obtener(`/cuentas/${encodeURIComponent(cuenta)}/fichas/${encodeURIComponent(codigo)}`)
}
