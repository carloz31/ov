import { enviar, obtener } from './cliente'
import type {
  CuentaResumen,
  DesbloqueoLegible,
  DesbloqueosMarcados,
  ResumenCuenta,
  ProgresoObjetivo,
  RespuestaServidor,
  TipoObjetivo,
} from '@/types/servidor'

export function listarCuentas(): Promise<RespuestaServidor<CuentaResumen[]>> {
  return obtener('/cuentas')
}

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

export function obtenerDesbloqueosNoVistos(cuenta: string): Promise<RespuestaServidor<DesbloqueoLegible[]>> {
  return obtener(`/cuentas/${encodeURIComponent(cuenta)}/desbloqueos?solo_no_vistos=true`)
}

export function marcarDesbloqueosVistos(cuenta: string): Promise<RespuestaServidor<DesbloqueosMarcados>> {
  return enviar(`/cuentas/${encodeURIComponent(cuenta)}/desbloqueos/marcar-vistos`, {})
}
