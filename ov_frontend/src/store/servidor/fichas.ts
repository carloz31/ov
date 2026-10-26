import * as apiAcciones from '@/services/api/acciones'
import { consultarCuenta } from './sesion'
import { vencerSeccion } from './secciones'

// Ajuste mochila: el modal de ficha registra VISTA_FICHA al abrirse; si fue la primera vez, la mochila
// vuelve a pedir las fichas para apagar «Nueva». Quien la llama no espera la respuesta.
export async function verFicha(ficha: string) {
  const respuesta = await consultarCuenta((cuenta) => apiAcciones.verFicha(cuenta, ficha))
  if (respuesta.tipo === 'ok' && respuesta.datos.eventos_registrados?.length) vencerSeccion('fichas')
  return respuesta
}
