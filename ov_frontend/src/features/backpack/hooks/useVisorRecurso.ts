import { updateAdventure, useAdventure } from '@/store/adventureStore'
import { updateJourney, useJourney } from '@/store/journeyStore'
import type { TravelResource } from '../lib/travelerResources'

// Lectura y favoritos de un recurso abierto en el visor (F04d: la mochila y el visor sobre una actividad).
export function useVisorRecurso(resource?: TravelResource) {
  const journey = useJourney(),
    adventure = useAdventure()
  const id = resource?.id ?? ''
  return {
    leida: (journey.readResourceIds ?? journey.resources).includes(id),
    marcarLeida: () =>
      updateJourney((current) => ({
        ...current,
        readResourceIds: [...new Set([...(current.readResourceIds ?? current.resources), id])],
      })),
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
