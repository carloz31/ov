import { obtener } from './cliente'
import type {
  AvanceInstrumento,
  ComparacionAutopercepcion,
  ItemPublico,
  RespuestasActividad,
  RespuestaServidor,
  ResultadoHistorico,
  ResultadoPublico,
} from '@/types/servidor'

export function obtenerItems(actividad: string): Promise<RespuestaServidor<ItemPublico[]>> {
  return obtener(`/actividades/${encodeURIComponent(actividad)}/items`)
}

export function obtenerRespuestas(
  cuenta: string,
  actividad: string,
): Promise<RespuestaServidor<RespuestasActividad>> {
  return obtener(
    `/cuentas/${encodeURIComponent(cuenta)}/actividades/${encodeURIComponent(actividad)}/respuestas`,
  )
}

export function obtenerAvance(cuenta: string): Promise<RespuestaServidor<AvanceInstrumento[]>> {
  return obtener(`/cuentas/${encodeURIComponent(cuenta)}/instrumentos`)
}

const rutaInstrumento = (cuenta: string, instrumento: string) =>
  `/cuentas/${encodeURIComponent(cuenta)}/instrumentos/${encodeURIComponent(instrumento)}`

export function obtenerResultado(
  cuenta: string,
  instrumento: string,
  aplicacion?: string,
): Promise<RespuestaServidor<ResultadoPublico>> {
  const consulta = aplicacion ? `?aplicacion=${encodeURIComponent(aplicacion)}` : ''
  return obtener<ResultadoPublico>(`${rutaInstrumento(cuenta, instrumento)}/resultado${consulta}`)
}

export function obtenerHistorial(
  cuenta: string,
  instrumento: string,
): Promise<RespuestaServidor<ResultadoHistorico[]>> {
  return obtener(`${rutaInstrumento(cuenta, instrumento)}/historial`)
}

export function obtenerComparacion(
  cuenta: string,
  instrumento: string,
): Promise<RespuestaServidor<ComparacionAutopercepcion>> {
  return obtener(`${rutaInstrumento(cuenta, instrumento)}/comparacion`)
}
