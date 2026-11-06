import * as apiAcciones from '@/services/api/acciones'
import type { TestimonioEstado } from '@/types/servidor'
import { consultarCuenta, obtenerEstadoServidor, publicar } from './sesion'

// Ajuste mochila: los testimonios viven en su sección (`useTestimoniosServidor`). Una acción confirmada sobre
// uno (vista, favorito) se aplica a lo ya cargado, sin volver a pedirlos.
export function actualizarTestimonio(codigo: string, cambios: Partial<TestimonioEstado>) {
  const testimonios = obtenerEstadoServidor().testimonios
  if (!testimonios.datos) return
  publicar({
    testimonios: {
      ...testimonios,
      datos: testimonios.datos.map((t) => (t.codigo === codigo ? { ...t, ...cambios } : t)),
    },
  })
}
// Registra VISTA_TESTIMONIO la primera vez; quien la llama no espera la respuesta.
export async function verTestimonio(testimonio: string) {
  const respuesta = await consultarCuenta((cuenta) => apiAcciones.verTestimonio(cuenta, testimonio))
  if (respuesta.tipo === 'ok') actualizarTestimonio(testimonio, { visto: true })
  return respuesta
}
