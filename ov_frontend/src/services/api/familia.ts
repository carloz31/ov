import { obtener } from './cliente'
import type { FamiliaApoderado, RespuestaServidor, ResultadoPublico } from '@/types/servidor'

export function obtenerFamilia(cuenta: string): Promise<RespuestaServidor<FamiliaApoderado>> {
  return obtener(`/cuentas/${encodeURIComponent(cuenta)}/familia`)
}

// B12: resultados vigentes del hijo visibles al apoderado; sin diploma, 409 con su mensaje.
export function obtenerResultadosHijo(cuenta: string): Promise<RespuestaServidor<ResultadoPublico[]>> {
  return obtener(`/cuentas/${encodeURIComponent(cuenta)}/familia/resultados`)
}
