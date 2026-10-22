import * as apiTestimonios from '@/services/api/testimonios'
import * as apiAcciones from '@/services/api/acciones'
import { consultarCuenta } from './sesion'

export function consultarTestimonios() {
  return consultarCuenta(apiTestimonios.obtenerTestimonios)
}
// Registra VISTA_TESTIMONIO la primera vez; quien la llama no espera la respuesta.
export function verTestimonio(testimonio: string) {
  return consultarCuenta((cuenta) => apiAcciones.verTestimonio(cuenta, testimonio))
}
