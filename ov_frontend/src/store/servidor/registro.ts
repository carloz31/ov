import * as apiRegistro from '@/services/api/registro'
import { consultarCuenta } from './sesion'
import { accionConRefresco } from './refresco'
import type { AccionConRefresco } from './refresco'
import type { ItemEdicion, OpcionElegida, RespuestaRegistroAccion } from '@/types/servidor'

export function consultarItemsRegistro(actividad: string) {
  return apiRegistro.obtenerItemsRegistro(actividad)
}
export function consultarRegistro(actividad: string) {
  return consultarCuenta((cuenta) => apiRegistro.obtenerRegistro(cuenta, actividad))
}
export function guardarBorradorRegistro(
  actividad: string,
  item: string,
  texto: string,
  opciones: OpcionElegida[],
  posicion?: string,
) {
  return consultarCuenta((cuenta) =>
    apiRegistro.enviarBorrador({ cuenta, actividad, item, texto, opciones, posicion }),
  )
}

export type AccionRegistro = AccionConRefresco<RespuestaRegistroAccion>
const accionRegistro = accionConRefresco<RespuestaRegistroAccion>
export function entregarRegistro(actividad: string, confirmada?: RespuestaRegistroAccion) {
  return accionRegistro((cuenta) => apiRegistro.enviarEntrega(cuenta, actividad), confirmada)
}
export function responderSeguimiento(
  actividad: string,
  item: string,
  texto: string,
  confirmada?: RespuestaRegistroAccion,
) {
  return accionRegistro(
    (cuenta) => apiRegistro.enviarRespuestaSeguimiento(cuenta, actividad, item, texto),
    confirmada,
  )
}
export function continuarSinResponder(actividad: string, item: string, confirmada?: RespuestaRegistroAccion) {
  return accionRegistro(
    (cuenta) => apiRegistro.enviarContinuarSinResponder(cuenta, actividad, item),
    confirmada,
  )
}
// F02: reentrega los ítems cuyo texto cambió; abre un intento con su seguimiento.
export function editarRegistro(actividad: string, items: ItemEdicion[], confirmada?: RespuestaRegistroAccion) {
  return accionRegistro((cuenta) => apiRegistro.enviarEdicion(cuenta, actividad, items), confirmada)
}
