import { obtener } from './cliente'
import type { BatallaCuenta, PreguntaIntento, RespuestaServidor } from '@/types/servidor'

export function obtenerBatallas(cuenta: string): Promise<RespuestaServidor<BatallaCuenta[]>> {
  return obtener(`/cuentas/${encodeURIComponent(cuenta)}/batallas`)
}

export function obtenerPreguntasBatalla(
  cuenta: string,
  actividad: string,
): Promise<RespuestaServidor<PreguntaIntento[]>> {
  return obtener(`/cuentas/${encodeURIComponent(cuenta)}/batallas/${encodeURIComponent(actividad)}/preguntas`)
}
