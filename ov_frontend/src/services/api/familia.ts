import { obtener } from './cliente'
import type { FamiliaApoderado, RespuestaServidor, ResultadoPublico } from '@/types/servidor'

export function obtenerFamilia(cuenta: string): Promise<RespuestaServidor<FamiliaApoderado>> {
  return obtener(`/cuentas/${encodeURIComponent(cuenta)}/familia`)
}

// B12: resultados vigentes del hijo visibles al apoderado; sin diploma, 409 con su mensaje. Ajuste
// inicio-apoderado: `estudiante` elige el hijo (sin él, el primero); un hijo ajeno, 404.
export function obtenerResultadosHijo(
  cuenta: string,
  estudiante?: string,
): Promise<RespuestaServidor<ResultadoPublico[]>> {
  const consulta = estudiante ? `?${new URLSearchParams({ estudiante })}` : ''
  return obtener(`/cuentas/${encodeURIComponent(cuenta)}/familia/resultados${consulta}`)
}
