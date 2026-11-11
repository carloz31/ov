import * as apiRegistro from '@/services/api/registro'
import { consultarCuenta } from './sesion'
import { accionConRefresco } from './refresco'
import type { AccionConRefresco } from './refresco'
import type { OpcionElegida, PasoRegistro, RespuestaRegistroAccion, RespuestaServidor } from '@/types/servidor'

export function consultarRegistro(actividad: string) {
  return consultarCuenta((cuenta) => apiRegistro.obtenerRegistro(cuenta, actividad))
}

export type AccionRegistro = AccionConRefresco<RespuestaRegistroAccion>
export type PasoConRefresco = AccionConRefresco<PasoRegistro>
// Un paso solo refresca el camino si trajo eventos o desbloqueos (una edición de un registro ya completado puede
// emitir los de la regla de adecuado); si no, se devuelve tal cual.
async function paso(
  accion: (cuenta: string) => Promise<RespuestaServidor<PasoRegistro>>,
): Promise<PasoConRefresco> {
  const respuesta = await consultarCuenta(accion)
  if (respuesta.tipo !== 'ok') return respuesta
  const { eventos_registrados: eventos, nuevos_desbloqueos: desbloqueos } = respuesta.datos
  if (!eventos?.length && !desbloqueos?.length) return respuesta
  return accionConRefresco<PasoRegistro>(() => Promise.resolve(respuesta), respuesta.datos)
}

export function responderItemRegistro(actividad: string, item: string, opciones: OpcionElegida[], texto: string) {
  return paso((cuenta) => apiRegistro.enviarRespuestaItem(cuenta, actividad, item, opciones, texto))
}
export function responderSeguimientoRegistro(actividad: string, item: string, texto: string) {
  return paso((cuenta) => apiRegistro.enviarRespuestaSeguimiento(cuenta, actividad, item, texto))
}
export function reenviarItemRegistro(actividad: string, item: string) {
  return paso((cuenta) => apiRegistro.enviarReenvio(cuenta, actividad, item))
}
// Terminar el registro: repetible (rehacer una actividad completada vuelve a llamarlo).
export function entregarRegistro(actividad: string, confirmada?: RespuestaRegistroAccion) {
  return accionConRefresco<RespuestaRegistroAccion>(
    (cuenta) => apiRegistro.enviarEntrega(cuenta, actividad),
    confirmada,
  )
}
