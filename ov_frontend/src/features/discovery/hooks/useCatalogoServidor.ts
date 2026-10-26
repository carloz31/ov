import { useEffect, useState } from 'react'
import { modoApi } from '@/config/env'
import {
  cargarLista,
  reintentarLista,
  useListaCatalogo,
  useOpcionesCatalogo,
  type ClaseCatalogo,
  type FiltrosCatalogo,
} from '@/store/servidor/catalogo'
import { alternarLetra } from '@/lib/servidor/adaptadoresCatalogo'
import type { TipoFavorito } from '@/types/servidor'
import { useFavoritoServidor } from './useFavoritoServidor'

export type SeccionCatalogo = 'professions' | 'careers' | 'institutions'
export const claseDeSeccion: Record<SeccionCatalogo, ClaseCatalogo> = {
  professions: 'ocupaciones',
  careers: 'carreras',
  institutions: 'instituciones',
}
export const tipoFavoritoDe: Record<ClaseCatalogo, TipoFavorito> = {
  carreras: 'CARRERA',
  ocupaciones: 'OCUPACION',
  instituciones: 'INSTITUCION',
}

// F06: en api, el catálogo, sus detalles y sus favoritos salen del servidor. En local, todo sigue como antes.
export function useCatalogoDelServidor() {
  return { catalogoDelServidor: modoApi }
}

const ESPERA_BUSQUEDA = 300

// La lista de la pestaña a la vista: búsqueda con espera, filtros de su clase, «Mis favoritos» y «Mostrar más».
export function useCatalogoServidor(seccion: SeccionCatalogo, busqueda: string) {
  const clase = claseDeSeccion[seccion]
  const [buscar, setBuscar] = useState(busqueda)
  const [filtros, setFiltros] = useState<Omit<FiltrosCatalogo, 'buscar'>>({})
  useEffect(() => {
    const espera = setTimeout(() => setBuscar(busqueda), ESPERA_BUSQUEDA)
    return () => clearTimeout(espera)
  }, [busqueda])
  // Cada pestaña empieza sin filtros.
  useEffect(() => setFiltros({}), [clase])
  const completos: FiltrosCatalogo = { ...filtros, buscar }
  const lista = useListaCatalogo(clase, completos, true)
  const opciones = useOpcionesCatalogo(clase !== 'ocupaciones')
  const favorito = useFavoritoServidor()
  const cambiar = (cambios: Partial<FiltrosCatalogo>) => setFiltros((actuales) => ({ ...actuales, ...cambios }))
  return {
    clase,
    lista,
    filtros,
    opciones,
    cargando: !lista || lista.estado === 'cargando',
    sinResultados: lista?.estado === 'listo' && lista.items.length === 0,
    hayMas: !!lista && lista.estado !== 'cargando' && lista.items.length < lista.total,
    cambiar,
    alternarLetra: (letra: string) => cambiar({ riasec: alternarLetra(filtros.riasec ?? '', letra) }),
    alternarFavoritos: () => cambiar({ favoritos: !filtros.favoritos }),
    mostrarMas: () => void cargarLista(clase, completos, true),
    reintentar: () => void reintentarLista(clase, completos),
    favorito: {
      ...favorito,
      alternar: (codigo: string, marcar: boolean) => favorito.alternar(tipoFavoritoDe[clase], codigo, marcar),
      pendiente: (codigo: string) => favorito.pendiente(tipoFavoritoDe[clase], codigo),
    },
  }
}
