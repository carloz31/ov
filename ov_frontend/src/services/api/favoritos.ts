import { enviar } from './cliente'
import type { RespuestaAccion, RespuestaServidor } from '@/types/servidor'

// Ajuste mochila: favoritos de fichas y testimonios (el catálogo usa los mismos tipos en el backend).
export type TipoFavoritoMochila = 'FICHA' | 'TESTIMONIO'

export function marcarFavorito(
  cuenta: string,
  tipo: TipoFavoritoMochila,
  codigo: string,
): Promise<RespuestaServidor<RespuestaAccion>> {
  return enviar('/acciones/marcar-favorito', { cuenta, tipo, codigo })
}

export function desmarcarFavorito(
  cuenta: string,
  tipo: TipoFavoritoMochila,
  codigo: string,
): Promise<RespuestaServidor<RespuestaAccion>> {
  return enviar('/acciones/desmarcar-favorito', { cuenta, tipo, codigo })
}
