import { obtener } from './cliente'
import type {
  ResumenCuenta,
  ProgresoObjetivo,
  RespuestaServidor,
  TipoObjetivo,
} from '@/types/servidor'

export function obtenerResumen(cuenta: string): Promise<RespuestaServidor<ResumenCuenta>> {
  return obtener(`/cuentas/${encodeURIComponent(cuenta)}/resumen`)
}

export function obtenerProgreso(
  cuenta: string,
  tipo: TipoObjetivo,
  codigo: string,
): Promise<RespuestaServidor<ProgresoObjetivo>> {
  return obtener(`/cuentas/${encodeURIComponent(cuenta)}/progreso/${tipo}/${encodeURIComponent(codigo)}`)
}
