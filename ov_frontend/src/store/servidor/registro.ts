import * as apiRegistro from '@/services/api/registro'
import { consultarCuenta, obtenerEstadoServidor, publicar } from './sesion'
import { accionConRefresco } from './refresco'
import type { AccionConRefresco } from './refresco'
import type { EstadoRegistro, OpcionElegida, PasoRegistro, RespuestaRegistroAccion, RespuestaServidor } from '@/types/servidor'

export function consultarRegistro(actividad: string) {
  return consultarCuenta((cuenta) => apiRegistro.obtenerRegistro(cuenta, actividad))
}

export type AccionRegistro = AccionConRefresco<RespuestaRegistroAccion>
export type PasoConRefresco = AccionConRefresco<PasoRegistro>
// Ajuste coherencia-bloque1: el estado del registro que confirma un paso (EN_CURSO tras la primera respuesta) se
// aplica a las actividades ya cargadas, sin volver a pedirlas, para que el mapa y su panel no sigan diciendo
// «Iniciar actividad» de un registro a medias o con todo respondido y sin entregar.
function reflejarEstado(actividad: string, estado: EstadoRegistro | null) {
  const actividades = obtenerEstadoServidor().actividades
  if (!estado || !actividades.datos) return
  const actual = actividades.datos.flatMap((b) => b.actividades).find((a) => a.codigo === actividad)
  if (!actual || actual.estado === estado) return
  publicar({
    actividades: {
      ...actividades,
      datos: actividades.datos.map((b) => ({
        ...b,
        actividades: b.actividades.map((a) => (a.codigo === actividad ? { ...a, estado } : a)),
      })),
    },
  })
}

// Un paso solo refresca el camino si trajo eventos o desbloqueos (una edición de un registro ya completado puede
// emitir los de la regla de adecuado); si no, se devuelve tal cual.
async function paso(
  actividad: string,
  accion: (cuenta: string) => Promise<RespuestaServidor<PasoRegistro>>,
): Promise<PasoConRefresco> {
  const respuesta = await consultarCuenta(accion)
  if (respuesta.tipo !== 'ok') return respuesta
  reflejarEstado(actividad, respuesta.datos.registro.estado)
  const { eventos_registrados: eventos, nuevos_desbloqueos: desbloqueos } = respuesta.datos
  if (!eventos?.length && !desbloqueos?.length) return respuesta
  return accionConRefresco<PasoRegistro>(() => Promise.resolve(respuesta), respuesta.datos)
}

export function responderItemRegistro(actividad: string, item: string, opciones: OpcionElegida[], texto: string) {
  return paso(actividad, (cuenta) => apiRegistro.enviarRespuestaItem(cuenta, actividad, item, opciones, texto))
}
export function responderSeguimientoRegistro(actividad: string, item: string, texto: string) {
  return paso(actividad, (cuenta) => apiRegistro.enviarRespuestaSeguimiento(cuenta, actividad, item, texto))
}
export function reenviarItemRegistro(actividad: string, item: string) {
  return paso(actividad, (cuenta) => apiRegistro.enviarReenvio(cuenta, actividad, item))
}
// Terminar el registro: repetible (rehacer una actividad completada vuelve a llamarlo).
export function entregarRegistro(actividad: string, confirmada?: RespuestaRegistroAccion) {
  return accionConRefresco<RespuestaRegistroAccion>(
    (cuenta) => apiRegistro.enviarEntrega(cuenta, actividad),
    confirmada,
  )
}
