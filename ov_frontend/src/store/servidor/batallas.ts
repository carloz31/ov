import * as apiBatallas from '@/services/api/batallas'
import * as apiAcciones from '@/services/api/acciones'
import { consultarCuenta } from './sesion'
import { accionConRefresco } from './refresco'
import type { RespuestaAccion, RespuestaBatallaEntrada } from '@/types/servidor'

export function consultarBatallas() {
  return consultarCuenta(apiBatallas.obtenerBatallas)
}
// F04b: cada intento pide preguntas nuevas al servidor; nunca se guardan ni se comparten entre intentos.
export function consultarPreguntasBatalla(actividad: string) {
  return consultarCuenta((cuenta) => apiBatallas.obtenerPreguntasBatalla(cuenta, actividad))
}
// Cada intento se guarda con sus respuestas; el servidor cuenta los aciertos. La primera victoria completa
// la batalla y trae sus desbloqueos.
export function resolverBatalla(
  actividad: string,
  victoria: boolean,
  respuestas: RespuestaBatallaEntrada[],
  confirmada?: RespuestaAccion,
) {
  return accionConRefresco(
    (cuenta) => apiAcciones.resolverBatalla({ cuenta, actividad, victoria, respuestas }),
    confirmada,
  )
}
