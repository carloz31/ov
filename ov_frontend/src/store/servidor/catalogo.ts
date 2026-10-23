import * as apiCatalogo from '@/services/api/catalogo'
import { consultarCuenta } from './sesion'

// La hoja de vida de la Central pide su ocupación al abrirse.
export function consultarOcupacion(codigo: string) {
  return consultarCuenta((cuenta) => apiCatalogo.obtenerOcupacion(cuenta, codigo))
}
