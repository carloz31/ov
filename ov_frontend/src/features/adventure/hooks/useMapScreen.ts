import { useEffect, useState } from 'react'
import { modoApi } from '@/config/env'
import { mensajeErrorServidor, useEstadoServidor } from '@/store/servidor/sesion'
import { useDiarioPreguntasServidor } from '@/store/servidor/secciones'
import { cartaDeActividad, cartasDiario } from '@/lib/servidor/adaptadoresDiario'
import { consultarItems } from '@/store/servidor/consultas'
import { ciudadDisponible, mensajeBloqueo } from '@/lib/servidor/adaptadores'
import { guiaCaminoApi, guideSteps } from '@/data/content/guideTexts'
import { inicialesViajero } from './useTravelerLevel'
import type { JourneyState } from '@/types/activities'
import { canAccessCity } from '@/store/adventureStore'
import type { AdventureState } from '@/types/adventure'
import { getPointDetails, type PointDetails } from '@/features/adventure/lib/pointDetails'
import {
  getRecommendedPoint,
  getZoneProgress,
  type StudentMapPoint,
  type StudentZone,
} from '@/features/adventure/lib/mapPoints'
import { getCaminoPoints } from '@/features/adventure/lib/caminoPoints'
import { getCiudadPoints } from '@/features/adventure/lib/ciudadPoints'
import { actividadesDisponibles, siguientePaso } from '@/features/adventure/lib/siguientePaso'
export function useMapScreen({
  zone,
  points,
  adventure,
  journey,
  selectedId,
}: {
  zone: StudentZone
  points: StudentMapPoint[]
  adventure: AdventureState
  journey: JourneyState
  selectedId?: string
}) {
  const servidor = useEstadoServidor()
  // El requisito ya llega en `bloqueo`; solo Mara consulta sus ítems para describir el encuentro.
  const [detalleServidor, setDetalleServidor] = useState<{
    clave: string
    description?: string
    listo?: boolean
  }>()
  const cityOpen = canAccessCity(adventure)
  const locked = zone === 'central' && !cityOpen
  // En api, el siguiente paso de toda la ruta guía el panel, el panel plegado y el pulso del mapa.
  const ruta = modoApi ? [...getCaminoPoints(adventure, journey), ...getCiudadPoints(adventure, journey)] : []
  const siguiente = modoApi
    ? siguientePaso(servidor.actividades.datos, ruta, zone === 'missions' ? 'camino' : 'ciudad')
    : undefined
  const recommended =
    siguiente === undefined
      ? getRecommendedPoint(points)
      : siguiente && 'punto' in siguiente
        ? points.find((p) => p.zone === siguiente.punto.zone && p.id === siguiente.punto.id)
        : undefined
  const progress = getZoneProgress(zone, adventure, journey)
  const selected = points.find((point) => point.id === selectedId)
  const baseDetails = selected ? getPointDetails(selected, adventure, journey) : undefined
  const claveDetalle = `${servidor.resumen.datos?.cuenta.codigo}/${selected?.id}/${selected?.specActivityId}/${selected?.status}`
  // Ajuste del diario (F05): en api, la entrada de diario del drawer es la carta que abrió esa actividad.
  const diarioAbierto = servidor.secciones.datos?.some(
    (s) => s.codigo === 'DIARIO' && s.estado === 'DISPONIBLE',
  )
  const preguntas = useDiarioPreguntasServidor(modoApi && !!selected && !!diarioAbierto)
  const carta =
    modoApi && selected?.specActivityId
      ? cartaDeActividad(cartasDiario(preguntas.datos), selected.specActivityId)
      : undefined
  const conServidor =
    baseDetails && detalleServidor?.clave === claveDetalle
      ? { ...baseDetails, ...detalleServidor }
      : baseDetails
  const details =
    conServidor && modoApi
      ? {
          ...conServidor,
          journal: carta && {
            completed: true,
            activityId: selected!.specActivityId!,
            title: carta.nombre,
            prompt: carta.texto ?? 'Lumi tiene una carta para ti',
            pregunta: carta.codigo,
            remitente: carta.remitente?.titulo,
          },
        }
      : conServidor
  const selectedPointId = selected?.id
  const selectedActivityId = selected?.specActivityId
  const selectedStatus = selected?.status
  const selectedZone = selected?.zone
  useEffect(() => {
    if (!modoApi || selectedPointId !== 'mara-test' || !selectedActivityId) return
    let vigente = true
    setDetalleServidor({ clave: claveDetalle })
    void (async () => {
      const items = await consultarItems(selectedActivityId)
      if (!vigente) return
      setDetalleServidor({
        clave: claveDetalle,
        listo: true,
        ...(items
          ? {
              description:
                items.tipo === 'ok'
                  ? `Conversa con Mara y responde ${items.datos.length} ítems en esta interacción. No hay respuestas correctas o incorrectas.`
                  : mensajeErrorServidor(items),
            }
          : {}),
      })
    })()
    return () => {
      vigente = false
    }
  }, [
    claveDetalle,
    servidor.actividades.datos,
    selectedPointId,
    selectedActivityId,
    selectedStatus,
    selectedZone,
  ])

  // Ajustes Central (6): el drawer espera sus datos (las actividades del servidor y la descripción de Mara)
  // y, en api, los de sus bloques, para no pintarse a medias.
  const cargaDrawer = {
    base:
      modoApi &&
      (!servidor.actividades.datos ||
        (selectedPointId === 'mara-test' &&
          !!selectedActivityId &&
          !(detalleServidor?.clave === claveDetalle && detalleServidor.listo))),
    esperaBloques: modoApi,
  }
  return {
    cityOpen,
    cargaDrawer,
    locked,
    recommended,
    siguiente,
    disponibles: actividadesDisponibles(ruta),
    progress,
    selected,
    details,
    selectedPointId,
    accionDisponible: (detail: PointDetails) => !(detail.disabled || (modoApi && servidor.error)),
    mostrarMisionesAdicionales: zone === 'missions' && !modoApi,
    // Solo api: la Ciudad cerrada se explica desde el selector, con el mensaje del bloque CIUDAD.
    ciudadBloqueo:
      modoApi && !ciudadDisponible(servidor.actividades.datos)
        ? (mensajeBloqueo(servidor.actividades.datos, 'CIUDAD') ?? '')
        : undefined,
    mostrarCiudadBloqueada: locked && !modoApi,
    pasosAyuda: modoApi && zone === 'missions' ? guiaCaminoApi : guideSteps[zone],
    iniciales: inicialesViajero(servidor.resumen.datos?.cuenta.nombre),
  }
}
