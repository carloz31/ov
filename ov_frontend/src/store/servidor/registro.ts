import * as apiRegistro from '@/services/api/registro'
import { modoApi } from '@/config/env'
import { cuentaActiva } from './cuenta'
import { consultarCuenta, sesionServidor } from './sesion'
import { incorporarDesbloqueos } from './avisos'
import { refrescar } from './refresco'
import type { ErrorServidor, OpcionElegida, RespuestaRegistroAccion, RespuestaServidor } from '@/types/servidor'

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

export type AccionRegistro =
  | RespuestaServidor<RespuestaRegistroAccion>
  | { tipo: 'guardado_sin_refrescar'; datos: RespuestaRegistroAccion; error: ErrorServidor }

// Entregar, responder y omitir devuelven eventos y desbloqueos: como completar, refrescan el camino.
// Con `confirmada`, solo se reintenta el refresco de una acción que el servidor ya guardó.
async function accionRegistro(
  accion: (cuenta: string) => Promise<RespuestaServidor<RespuestaRegistroAccion>>,
  confirmada?: RespuestaRegistroAccion,
): Promise<AccionRegistro> {
  const cuenta = cuentaActiva()
  const sesion = sesionServidor()
  if (!modoApi || !cuenta) return { tipo: 'http', estado: 400, detalle: 'No hay una cuenta de servidor activa.' }
  const respuesta: RespuestaServidor<RespuestaRegistroAccion> = confirmada
    ? { tipo: 'ok', datos: confirmada }
    : await accion(cuenta)
  if (respuesta.tipo !== 'ok') return respuesta
  if (cuenta !== cuentaActiva() || sesion !== sesionServidor())
    return { tipo: 'http', estado: 409, detalle: 'La cuenta activa cambió durante la acción.' }
  incorporarDesbloqueos(respuesta.datos.nuevos_desbloqueos)
  const estado = await refrescar(respuesta.datos.nuevos_desbloqueos)
  return estado.tipo === 'ok' ? respuesta : { tipo: 'guardado_sin_refrescar', datos: respuesta.datos, error: estado }
}
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
