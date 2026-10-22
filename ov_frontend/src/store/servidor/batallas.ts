import * as apiBatallas from '@/services/api/batallas'
import * as apiAcciones from '@/services/api/acciones'
import { consultarCuenta } from './sesion'
import { accionConRefresco } from './refresco'
import type { RespuestaAccion } from '@/types/servidor'

export function consultarBatallas() {
  return consultarCuenta(apiBatallas.obtenerBatallas)
}
// Cada intento se guarda; la primera victoria completa la batalla y trae sus desbloqueos.
export function resolverBatalla(
  actividad: string,
  intento: { victoria: boolean; aciertos: number; preguntas: number },
  confirmada?: RespuestaAccion,
) {
  return accionConRefresco((cuenta) => apiAcciones.resolverBatalla({ cuenta, actividad, ...intento }), confirmada)
}
