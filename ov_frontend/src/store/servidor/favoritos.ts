import * as apiFavoritos from '@/services/api/favoritos'
import type { TipoFavoritoMochila } from '@/services/api/favoritos'
import { consultarCuenta } from './sesion'
import { vencerSeccion } from './secciones'

// Ajuste mochila: marca o desmarca una ficha o un testimonio en el servidor. Una ficha vuelve a pedir las
// fichas; los testimonios los vuelve a pedir la mochila, que no los guarda en una sección.
export async function alternarFavorito(tipo: TipoFavoritoMochila, codigo: string, marcar: boolean) {
  const respuesta = await consultarCuenta((cuenta) =>
    marcar ? apiFavoritos.marcarFavorito(cuenta, tipo, codigo) : apiFavoritos.desmarcarFavorito(cuenta, tipo, codigo),
  )
  if (tipo === 'FICHA') vencerSeccion('fichas')
  return respuesta
}
