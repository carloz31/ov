import { useEffect, useState } from 'react'
import { modoApi } from '@/config/env'
import { mensajeErrorServidor, useEstadoServidor } from '@/store/servidor/sesion'
import { consultarItems } from '@/store/servidor/consultas'
import { ciudadDisponible, mensajeBloqueo } from '@/lib/servidor/adaptadores'
import { guiaCaminoApi, guideSteps } from '@/data/content/guideTexts'
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
  const [detalleServidor, setDetalleServidor] = useState<{ clave: string; description?: string }>()
  const cityOpen = canAccessCity(adventure)
  const locked = zone === 'central' && !cityOpen
  const recommended = getRecommendedPoint(points)
  const progress = getZoneProgress(zone, adventure, journey)
  const selected = points.find((point) => point.id === selectedId)
  const baseDetails = selected ? getPointDetails(selected, adventure, journey) : undefined
  const claveDetalle = `${servidor.resumen.datos?.cuenta.codigo}/${selected?.id}/${selected?.specActivityId}/${selected?.status}`
  const details =
    baseDetails && detalleServidor?.clave === claveDetalle
      ? { ...baseDetails, ...detalleServidor }
      : baseDetails
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

  return {
    cityOpen,
    locked,
    recommended,
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
  }
}
