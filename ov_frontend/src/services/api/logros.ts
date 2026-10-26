import { enviar, obtener } from './cliente'
import type { LogrosCuenta, RespuestaServidor, VitrinaCuenta } from '@/types/servidor'

export function obtenerLogros(cuenta: string): Promise<RespuestaServidor<LogrosCuenta>> {
  return obtener(`/cuentas/${encodeURIComponent(cuenta)}/logros`)
}

// Ajuste pasaporte-perfil: reemplaza la vitrina completa; `[]` la vacía.
export function enviarVitrina(cuenta: string, codigos: string[]): Promise<RespuestaServidor<VitrinaCuenta>> {
  return enviar('/acciones/vitrina', { cuenta, codigos })
}
