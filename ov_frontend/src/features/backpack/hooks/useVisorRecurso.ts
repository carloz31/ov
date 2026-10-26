import { useEffect, useState } from 'react'
import { modoApi } from '@/config/env'
import { appPaths } from '@/routes/paths'
import { updateAdventure, useAdventure } from '@/store/adventureStore'
import { updateJourney } from '@/store/journeyStore'
import { cargarFicha, useFichaDetalle, verFicha } from '@/store/servidor/fichas'
import { mensajeErrorServidor } from '@/store/servidor/sesion'
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
  const [pendiente, setPendiente] = useState(false)
  const id = resource?.id ?? ''
  if (externo)
    return { favorito: externo.favorita, pendiente: !!externo.pendiente, alternarFavorito: externo.onFavorite }
  if (modoApi) {
    const favorito = !!resource?.favorita
    // Mientras el POST corre, el botón muestra un cargador; confirmado, el store actualiza la ficha cargada.
    return {
      favorito,
      pendiente,
      alternarFavorito: () => {
        if (!resource || pendiente) return
        setPendiente(true)
        void alternarFavorito(resource.kind === 'sheet' ? 'FICHA' : 'TESTIMONIO', id, !favorito).finally(() =>
          setPendiente(false),
        )
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
  // En api, el contenido de una ficha del servidor llega aparte: hasta entonces, el cuerpo muestra su carga.
  const remoto = modoApi && resource?.contenidoRemoto ? resource : undefined
  const detalle = useFichaDetalle(remoto?.id)
  const conContenido = remoto && detalle?.datos ? { ...remoto, content: detalle.datos.contenido } : resource
  return {
    recurso: conContenido,
    cargandoContenido: !!remoto && detalle?.estado !== 'listo' && detalle?.estado !== 'error',
    errorContenido: remoto && detalle?.estado === 'error' ? mensajeErrorServidor(detalle.error) : null,
    reintentarContenido: () => remoto && cargarFicha(remoto.id),
    minutos: tiempoLectura(conContenido?.content),
    hrefActividad: href,
    ...useVisorRecurso(resource, externo),
  }
}
