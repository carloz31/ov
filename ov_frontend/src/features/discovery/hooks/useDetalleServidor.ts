import { cargarDetalle, useDetalleCatalogo, type ClaseCatalogo } from '@/store/servidor/catalogo'
import { mensajeErrorServidor } from '@/store/servidor/sesion'
import { useCatalogVisit } from './useCatalogVisit'
import { tipoFavoritoDe } from './useCatalogoServidor'
import { useFavoritoServidor } from './useFavoritoServidor'

const tipos = { carreras: 'career', ocupaciones: 'occupation', instituciones: 'institution' } as const

// F06: el detalle del catálogo del servidor, pedido al abrirlo. Con el detalle a la vista se registra la vista.
export function useDetalleServidor<C extends ClaseCatalogo>(clase: C, codigo: string) {
  const detalle = useDetalleCatalogo(clase, codigo)
  const datos = detalle?.estado === 'listo' ? detalle.datos : null
  useCatalogVisit(tipos[clase], datos?.codigo)
  const favorito = useFavoritoServidor()
  const error = detalle?.estado === 'error' ? detalle.error : null
  return {
    datos,
    cargando: !detalle || detalle.estado === 'cargando',
    noExiste: error?.tipo === 'http' && error.estado === 404,
    error: error ? mensajeErrorServidor(error) : null,
    reintentar: () => cargarDetalle(clase, codigo, true),
    favorito: {
      ...favorito,
      alternar: (tipo: ClaseCatalogo, codigoItem: string, marcar: boolean) =>
        favorito.alternar(tipoFavoritoDe[tipo], codigoItem, marcar),
      pendiente: (tipo: ClaseCatalogo, codigoItem: string) => favorito.pendiente(tipoFavoritoDe[tipo], codigoItem),
    },
  }
}
