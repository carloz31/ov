import { useSyncExternalStore } from 'react'
import * as apiFavoritos from '@/services/api/favoritos'
import type { ClaseCatalogo } from '@/services/api/catalogo'
import type { FavoritosCuenta, RespuestaServidor, TipoFavorito } from '@/types/servidor'
import { actualizarFavoritoCatalogo } from './catalogo'
import { consultarCuenta, sesionServidor } from './sesion'
import { actualizarFicha } from './fichas'
import { actualizarTestimonio } from './testimonios'

const CLASES: Partial<Record<TipoFavorito, ClaseCatalogo>> = {
  CARRERA: 'carreras',
  OCUPACION: 'ocupaciones',
  INSTITUCION: 'instituciones',
}

// Marca o desmarca en el servidor. Confirmada, la marca se aplica a lo cargado sin volver a pedirlo: fichas y
// testimonios (ajuste mochila) o, en el catálogo (F06), listas y detalles. El resultado RIASEC no lleva favoritos
// (ajuste resultados-intereses).
export async function alternarFavorito(tipo: TipoFavorito, codigo: string, marcar: boolean) {
  const respuesta = await consultarCuenta((cuenta) =>
    marcar ? apiFavoritos.marcarFavorito(cuenta, tipo, codigo) : apiFavoritos.desmarcarFavorito(cuenta, tipo, codigo),
  )
  if (respuesta.tipo !== 'ok') return respuesta
  const clase = CLASES[tipo]
  if (tipo === 'FICHA') actualizarFicha(codigo, { es_favorita: marcar })
  else if (tipo === 'TESTIMONIO') actualizarTestimonio(codigo, { es_favorita: marcar })
  else if (clase) {
    actualizarFavoritoCatalogo(clase, codigo, marcar)
    favoritosCuenta.delete(sesionServidor())
    avisar()
  }
  return respuesta
}

// Los favoritos del catálogo para el perfil y Mis planes (hasta F07a): se piden al montar su vista, una vez por
// sesión de cuenta; una marca confirmada los descarta para pedirlos de nuevo. Sin efectos: el pedido sale de la
// lectura del almacén, que en local (`activos` falso) no hace nada, porque el arnés local no tiene efectos.
const favoritosCuenta = new Map<number, RespuestaServidor<FavoritosCuenta> | 'cargando'>()
const oyentes = new Set<() => void>()
const avisar = () => oyentes.forEach((oyente) => oyente())
const suscribir = (oyente: () => void) => {
  oyentes.add(oyente)
  return () => {
    oyentes.delete(oyente)
  }
}
function leerFavoritos(sesion: number, activos: boolean) {
  if (activos && !favoritosCuenta.has(sesion)) {
    favoritosCuenta.set(sesion, 'cargando')
    void consultarCuenta(apiFavoritos.obtenerFavoritos).then((respuesta) => {
      favoritosCuenta.set(sesion, respuesta)
      avisar()
    })
  }
  return favoritosCuenta.get(sesion)
}
export function useFavoritosCuenta(activos: boolean): FavoritosCuenta | null {
  const sesion = sesionServidor()
  const actual = useSyncExternalStore(suscribir, () => leerFavoritos(sesion, activos))
  return activos && actual && actual !== 'cargando' && actual.tipo === 'ok' ? actual.datos : null
}
