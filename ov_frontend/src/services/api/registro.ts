import { enviar, obtener } from './cliente'
import type {
  BorradorRegistroEntrada,
  EstadoItemRegistro,
  ItemEdicion,
  ItemRegistroPublico,
  RegistroConsultado,
  RespuestaRegistroAccion,
  RespuestaServidor,
} from '@/types/servidor'

export function obtenerItemsRegistro(actividad: string): Promise<RespuestaServidor<ItemRegistroPublico[]>> {
  return obtener(`/actividades/${encodeURIComponent(actividad)}/items-registro`)
}

export function obtenerRegistro(
  cuenta: string,
  actividad: string,
): Promise<RespuestaServidor<RegistroConsultado>> {
  return obtener(
    `/cuentas/${encodeURIComponent(cuenta)}/actividades/${encodeURIComponent(actividad)}/registro`,
  )
}

export function enviarBorrador(entrada: BorradorRegistroEntrada): Promise<RespuestaServidor<EstadoItemRegistro>> {
  return enviar('/acciones/registro/guardar-borrador', entrada)
}

export function enviarEntrega(
  cuenta: string,
  actividad: string,
): Promise<RespuestaServidor<RespuestaRegistroAccion>> {
  return enviar('/acciones/registro/entregar', { cuenta, actividad })
}

export function enviarRespuestaSeguimiento(
  cuenta: string,
  actividad: string,
  item: string,
  texto: string,
): Promise<RespuestaServidor<RespuestaRegistroAccion>> {
  return enviar('/acciones/registro/responder-seguimiento', { cuenta, actividad, item, texto })
}

export function enviarContinuarSinResponder(
  cuenta: string,
  actividad: string,
  item: string,
): Promise<RespuestaServidor<RespuestaRegistroAccion>> {
  return enviar('/acciones/registro/continuar-sin-responder', { cuenta, actividad, item })
}

export function enviarEdicion(
  cuenta: string,
  actividad: string,
  items: ItemEdicion[],
): Promise<RespuestaServidor<RespuestaRegistroAccion>> {
  return enviar('/acciones/registro/editar', { cuenta, actividad, items })
}
