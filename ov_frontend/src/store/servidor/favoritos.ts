import * as apiFavoritos from '@/services/api/favoritos'
import type { TipoFavoritoMochila } from '@/services/api/favoritos'
import { consultarCuenta } from './sesion'
import { actualizarFicha } from './fichas'

// Ajuste mochila: marca o desmarca una ficha o un testimonio en el servidor. Confirmada, una ficha se actualiza
// en las fichas cargadas, sin volver a pedirlas; los testimonios los actualiza la mochila, que los guarda.
export async function alternarFavorito(tipo: TipoFavoritoMochila, codigo: string, marcar: boolean) {
  const respuesta = await consultarCuenta((cuenta) =>
    marcar ? apiFavoritos.marcarFavorito(cuenta, tipo, codigo) : apiFavoritos.desmarcarFavorito(cuenta, tipo, codigo),
  )
  if (respuesta.tipo === 'ok' && tipo === 'FICHA') actualizarFicha(codigo, { es_favorita: marcar })
  return respuesta
}
