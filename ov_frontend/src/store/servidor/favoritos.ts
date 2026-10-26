import * as apiFavoritos from '@/services/api/favoritos'
import type { TipoFavoritoMochila } from '@/services/api/favoritos'
import { consultarCuenta } from './sesion'
import { actualizarFicha } from './fichas'
import { actualizarTestimonio } from './testimonios'

// Ajuste mochila: marca o desmarca una ficha o un testimonio en el servidor. Confirmada, una ficha se actualiza
// en las fichas o los testimonios cargados, sin volver a pedirlos.
export async function alternarFavorito(tipo: TipoFavoritoMochila, codigo: string, marcar: boolean) {
  const respuesta = await consultarCuenta((cuenta) =>
    marcar ? apiFavoritos.marcarFavorito(cuenta, tipo, codigo) : apiFavoritos.desmarcarFavorito(cuenta, tipo, codigo),
  )
  if (respuesta.tipo === 'ok')
    if (tipo === 'FICHA') actualizarFicha(codigo, { es_favorita: marcar })
    else actualizarTestimonio(codigo, { es_favorita: marcar })
  return respuesta
}
