import { useEffect, useState } from 'react'
import { modoApi } from '@/config/env'
import { appPaths } from '@/routes/paths'
import { updateAdventure, useAdventure } from '@/store/adventureStore'
import { updateJourney } from '@/store/journeyStore'
import { verFicha } from '@/store/servidor/fichas'
import { alternarFavorito } from '@/store/servidor/favoritos'
import { useActividadesServidor } from '@/store/servidor/secciones'
import { hrefActividad } from '@/features/discovery/lib/helenaPagesApi'
import { tiempoLectura } from '../lib/fichaLectura'
import type { TravelResource } from '../lib/travelerResources'

export type FavoritoExterno = { favorita: boolean; pendiente?: boolean; onFavorite: () => void }

// Favoritos de un recurso abierto en el visor (F04d: la mochila y el visor sobre una actividad). La mochila pasa
// su propia estrella (`externo`); sobre una actividad, en api se guarda en el servidor y en local, en el navegador.
export function useVisorRecurso(resource?: TravelResource, externo?: FavoritoExterno) {
  const adventure = useAdventure()
  const [optimista, setOptimista] = useState<{ id: string; valor: boolean } | null>(null)
  const [pendiente, setPendiente] = useState(false)
  const id = resource?.id ?? ''
  if (externo)
    return { favorito: externo.favorita, pendiente: !!externo.pendiente, alternarFavorito: externo.onFavorite }
  if (modoApi) {
    const favorito = optimista?.id === id ? optimista.valor : !!resource?.favorita
    // Mientras el POST corre, el botón muestra un cargador; el favorito cambia cuando el servidor confirma.
    return {
      favorito,
      pendiente,
      alternarFavorito: () => {
        if (!resource || pendiente) return
        setPendiente(true)
        void alternarFavorito(resource.kind === 'sheet' ? 'FICHA' : 'TESTIMONIO', id, !favorito).then((r) => {
          setPendiente(false)
          if (r.tipo === 'ok') setOptimista({ id, valor: !favorito })
        })
      },
    }
  }
  return {
    favorito: adventure.bookmarks.includes(id),
    pendiente: false,
    alternarFavorito: () =>
      updateAdventure((current) => ({
        ...current,
        bookmarks: current.bookmarks.includes(id)
          ? current.bookmarks.filter((saved) => saved !== id)
          : [...current.bookmarks, id],
      })),
  }
}

// Ajuste mochila: abrir el modal de ficha la marca como abierta, venga de donde venga. En api registra
// VISTA_FICHA (apaga «Nueva»); en local la agrega a las visitas y a las leídas, que reemplazan «Leí la ficha».
export function useFichaModal(
  resource: TravelResource | undefined,
  enlazarActividad: boolean,
  externo?: FavoritoExterno,
) {
  const actividades = useActividadesServidor(enlazarActividad && Boolean(resource))
  const id = resource?.id
  const visto = resource?.ficha?.visto
  useEffect(() => {
    if (!id) return
    if (modoApi) {
      if (visto === false) void verFicha(id)
      return
    }
    updateAdventure((current) =>
      current.visits.includes(id) ? current : { ...current, visits: [...current.visits, id] },
    )
    updateJourney((current) => {
      const leidas = current.readResourceIds ?? current.resources
      return leidas.includes(id) ? current : { ...current, readResourceIds: [...leidas, id] }
    })
  }, [id, visto])
  const actividad = resource?.ficha?.actividad
  const href =
    !enlazarActividad || !actividad
      ? undefined
      : modoApi
        ? hrefActividad(actividades.datos, actividad.codigo)
        : `${appPaths.student.missions}?actividad=${encodeURIComponent(actividad.codigo)}`
  return { minutos: tiempoLectura(resource?.content), hrefActividad: href, ...useVisorRecurso(resource, externo) }
}
