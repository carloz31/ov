import { enviar, obtener } from './cliente'
import type {
  OpcionElegida,
  PasoRegistro,
  RegistroConsultado,
  RespuestaRegistroAccion,
  RespuestaServidor,
} from '@/types/servidor'

export function obtenerRegistro(
  cuenta: string,
  actividad: string,
): Promise<RespuestaServidor<RegistroConsultado>> {
  return obtener(
    `/cuentas/${encodeURIComponent(cuenta)}/actividades/${encodeURIComponent(actividad)}/registro`,
  )
}

// Responder un ítem, la primera vez o para editarlo: un intento nuevo, evaluado; devuelve el paso siguiente.
export function enviarRespuestaItem(
  cuenta: string,
  actividad: string,
  item: string,
  opciones: OpcionElegida[],
  texto: string,
): Promise<RespuestaServidor<PasoRegistro>> {
  return enviar('/acciones/registro/responder', { cuenta, actividad, item, opciones, texto })
}

export function enviarRespuestaSeguimiento(
  cuenta: string,
  actividad: string,
  item: string,
  texto: string,
): Promise<RespuestaServidor<PasoRegistro>> {
  return enviar('/acciones/registro/responder-seguimiento', { cuenta, actividad, item, texto })
}

export function enviarReenvio(
  cuenta: string,
  actividad: string,
  item: string,
): Promise<RespuestaServidor<PasoRegistro>> {
  return enviar('/acciones/registro/reenviar', { cuenta, actividad, item })
}

export function enviarEntrega(
  cuenta: string,
  actividad: string,
): Promise<RespuestaServidor<RespuestaRegistroAccion>> {
  return enviar('/acciones/registro/entregar', { cuenta, actividad })
}
