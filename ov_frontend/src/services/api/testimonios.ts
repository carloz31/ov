import { obtener } from './cliente'
import type { RespuestaServidor, TestimonioEstado } from '@/types/servidor'

export function obtenerTestimonios(cuenta: string): Promise<RespuestaServidor<TestimonioEstado[]>> {
  return obtener(`/cuentas/${encodeURIComponent(cuenta)}/testimonios`)
}
