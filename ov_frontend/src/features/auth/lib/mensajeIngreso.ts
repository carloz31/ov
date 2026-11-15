import type { ErrorServidor } from '@/types/servidor'

// Auditoría plataforma: si el ingreso tarda más que esto, la pantalla avisa que siga esperando.
export const ESPERA_AVISO_INGRESO_MS = 8000
export const AVISO_INGRESO_LENTO = 'Hay muchas personas ingresando. Espera unos segundos, no recargues la página.'
export const MENSAJE_INGRESO_SIN_RESPUESTA =
  'No pudimos completar el ingreso porque el servidor tardó demasiado o no hubo conexión. Vuelve a intentarlo.'

// Un tiempo agotado (408, o 502, 503 y 504 de nginx o Amplify, que llegan sin JSON) o un error de red invitan a
// intentar de nuevo; el resto conserva el mensaje del servidor (credenciales, bloqueo, cuenta inactiva).
export function mensajeIngreso(error: ErrorServidor, mensajeServidor: (error: ErrorServidor) => string) {
  if (error.tipo === 'sin_conexion') return MENSAJE_INGRESO_SIN_RESPUESTA
  if (error.tipo === 'http' && [408, 502, 503, 504].includes(error.estado)) return MENSAJE_INGRESO_SIN_RESPUESTA
  return mensajeServidor(error)
}
