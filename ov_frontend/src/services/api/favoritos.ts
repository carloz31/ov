import { enviar, obtener } from './cliente'
import type { FavoritosCuenta, RespuestaAccion, RespuestaServidor, TipoFavorito } from '@/types/servidor'

// Favoritos del catálogo (F06) y de fichas y testimonios (ajuste mochila): las mismas acciones.
export function marcarFavorito(
  cuenta: string,
  tipo: TipoFavorito,
  codigo: string,
): Promise<RespuestaServidor<RespuestaAccion>> {
  return enviar('/acciones/marcar-favorito', { cuenta, tipo, codigo })
}

export function desmarcarFavorito(
  cuenta: string,
  tipo: TipoFavorito,
  codigo: string,
): Promise<RespuestaServidor<RespuestaAccion>> {
  return enviar('/acciones/desmarcar-favorito', { cuenta, tipo, codigo })
}

// Solo carreras, ocupaciones e instituciones.
export function obtenerFavoritos(cuenta: string): Promise<RespuestaServidor<FavoritosCuenta>> {
  return obtener(`/cuentas/${encodeURIComponent(cuenta)}/favoritos`)
}
