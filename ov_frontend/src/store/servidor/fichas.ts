import * as apiAcciones from '@/services/api/acciones'
import type { FichaCuenta } from '@/types/servidor'
import { consultarCuenta, obtenerEstadoServidor, publicar } from './sesion'

// Ajuste mochila: una acción confirmada sobre una ficha (vista, favorita) se aplica a las fichas ya cargadas,
// sin volver a pedirlas: la respuesta 200 del servidor basta.
export function actualizarFicha(codigo: string, cambios: Partial<FichaCuenta>) {
  const fichas = obtenerEstadoServidor().fichas
  if (!fichas.datos) return
  publicar({ fichas: { ...fichas, datos: fichas.datos.map((f) => (f.codigo === codigo ? { ...f, ...cambios } : f)) } })
}

// El modal de ficha registra VISTA_FICHA al abrirse; con la respuesta, la ficha deja de ser «Nueva». Quien la
// llama no espera la respuesta.
export async function verFicha(ficha: string) {
  const respuesta = await consultarCuenta((cuenta) => apiAcciones.verFicha(cuenta, ficha))
  if (respuesta.tipo === 'ok') actualizarFicha(ficha, { visto: true })
  return respuesta
}
