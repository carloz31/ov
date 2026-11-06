import { modoApi } from '@/config/env'
import { useFavoritosCuenta } from '@/store/servidor/favoritos'
import { useEstadoServidor } from '@/store/servidor/sesion'

// F06: los favoritos del catálogo para Mis planes y el perfil (hasta F07a). En api salen del servidor, pedidos al
// montar la vista y solo con el catálogo abierto; en local siguen en el navegador.
export function useFavoritosCatalogo() {
  const seccion = useEstadoServidor().secciones.datos?.find((s) => s.codigo === 'CATALOGO')
  const favoritos = useFavoritosCuenta(modoApi && !!seccion && seccion.estado !== 'BLOQUEADA')
  return { favoritosDelServidor: modoApi, favoritos }
}
