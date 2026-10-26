import { useEffect } from 'react'
import { modoApi } from '@/config/env'
import { appPaths } from '@/routes/paths'
import { updateAdventure, useAdventure } from '@/store/adventureStore'
import { updateJourney } from '@/store/journeyStore'
import { verFicha } from '@/store/servidor/fichas'
import { useActividadesServidor } from '@/store/servidor/secciones'
import { hrefActividad } from '@/features/discovery/lib/helenaPagesApi'
import { tiempoLectura } from '../lib/fichaLectura'
import type { TravelResource } from '../lib/travelerResources'

// Favoritos de un recurso abierto en el visor (F04d: la mochila y el visor sobre una actividad).
export function useVisorRecurso(resource?: TravelResource) {
  const adventure = useAdventure()
  const id = resource?.id ?? ''
  return {
    favorito: adventure.bookmarks.includes(id),
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
export function useFichaModal(resource: TravelResource | undefined, enlazarActividad: boolean) {
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
  return { minutos: tiempoLectura(resource?.content), hrefActividad: href, ...useVisorRecurso(resource) }
}
