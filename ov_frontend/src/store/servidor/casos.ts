import * as apiCasos from '@/services/api/casos'
import * as apiAcciones from '@/services/api/acciones'
import { consultarCuenta } from './sesion'
import { accionConRefresco } from './refresco'
import type { RespuestaResolverCaso } from '@/types/servidor'

export function consultarCasos() {
  return consultarCuenta(apiCasos.obtenerCasos)
}
export function consultarColeccion() {
  return consultarCuenta(apiCasos.obtenerColeccion)
}
// `ocupaciones`: las bien asignadas; entran a la colección solo si el intento supera el caso.
export function resolverCaso(
  actividad: string,
  puntaje: number,
  ocupaciones: string[],
  confirmada?: RespuestaResolverCaso,
) {
  return accionConRefresco(
    (cuenta) => apiAcciones.resolverCaso({ cuenta, actividad, puntaje, ocupaciones }),
    confirmada,
  )
}
