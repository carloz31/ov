import * as apiCuentas from '@/services/api/cuentas'
import * as apiInstrumentos from '@/services/api/instrumentos'
import { consultarCuenta } from './sesion'
import type { TipoObjetivo } from '@/types/servidor'
export function consultarProgreso(tipo: TipoObjetivo, codigo: string) {
  return consultarCuenta((cuenta) => apiCuentas.obtenerProgreso(cuenta, tipo, codigo))
}
export function consultarItems(actividad: string) {
  return apiInstrumentos.obtenerItems(actividad)
}
export function consultarRespuestas(actividad: string) {
  return consultarCuenta((cuenta) => apiInstrumentos.obtenerRespuestas(cuenta, actividad))
}
export function consultarAvanceInstrumentos() {
  return consultarCuenta(apiInstrumentos.obtenerAvance)
}
