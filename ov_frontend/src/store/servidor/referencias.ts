import * as apiReferencias from '@/services/api/referencias'
import { consultarCuenta } from './sesion'

// F02: lo que un registro retoma de la propia cuenta; se pide al abrir el registro que lo usa.
export function consultarReferencias(actividad: string) {
  return consultarCuenta((cuenta) => apiReferencias.obtenerReferencias(cuenta, actividad))
}
