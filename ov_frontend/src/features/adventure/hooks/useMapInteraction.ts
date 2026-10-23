import { useMapScreen } from '@/features/adventure/hooks/useMapScreen'
import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router'
import type { JourneyState } from '@/types/activities'
import type { AdventureState } from '@/types/adventure'
import { appPaths } from '@/routes/paths'
import { useStudentOverlays } from '@/features/adventure/context/overlayContext'
import { useStudentUi } from '@/store/studentUiStore'
import { type MapCanvasHandle } from '@/features/adventure/components/MapCanvas'
import { type PointDetails } from '@/features/adventure/lib/pointDetails'
import { type StudentMapPoint, type StudentZone } from '@/features/adventure/lib/mapPoints'
import { initialScale } from '@/features/adventure/lib/geometry'
import { pasosBloqueo } from '@/data/content/guideTexts'
import { useRevelarOpcionales } from './useRevelarOpcionales'
export function useMapInteraction({
  zone,
  points,
  adventure,
  journey,
}: {
  zone: StudentZone
  points: StudentMapPoint[]
  adventure: AdventureState
  journey: JourneyState
}) {
  const ui = useStudentUi()
  const navigate = useNavigate()
  const [params, setParams] = useSearchParams()
  const canvas = useRef<MapCanvasHandle>(null)
  const frameAdditional = useCallback((ids: string[]) => {
    canvas.current?.framePoints(ids)
  }, [])
  const returnPoint = useRef<string | undefined>(undefined)
  const mobilePanelButton = useRef<HTMLButtonElement>(null)
  const selectedId = params.get('punto') ?? undefined
  const [scale, setScale] = useState(initialScale)
  const [minimumScale, setMinimumScale] = useState(0)
  const { openGuide, openCheckIn, announcementBlocked } = useStudentOverlays()
  const [mobilePanelOpen, setMobilePanelOpen] = useState(false)
  const [mobile, setMobile] = useState(false)
  useEffect(() => {
    const query = window.matchMedia('(max-width: 767px)')
    const update = () => {
      setMobile(query.matches)
      if (!query.matches) setMobilePanelOpen(false)
    }
    update()
    query.addEventListener('change', update)
    return () => query.removeEventListener('change', update)
  }, [])
  const {
    cityOpen,
    locked,
    recommended,
    siguiente,
    disponibles,
    progress,
    selected,
    details,
    selectedPointId,
    accionDisponible,
    mostrarMisionesAdicionales,
    ciudadBloqueo,
    mostrarCiudadBloqueada,
    pasosAyuda,
    iniciales,
  } = useMapScreen({ zone, points, adventure, journey, selectedId })
  useRevelarOpcionales({
    zone,
    points,
    enabled: !announcementBlocked && !selectedId && !mobilePanelOpen,
    onFrame: frameAdditional,
  })
  const explicarCiudad =
    ciudadBloqueo === undefined ? undefined : () => openGuide(pasosBloqueo('CIUDAD', ciudadBloqueo))
  // Entrada directa a la Ciudad cerrada (api): vuelve al Camino y Lumi explica qué falta, una sola vez.
  const ciudadExplicada = useRef(false)
  useEffect(() => {
    if (zone !== 'central' || !locked || ciudadBloqueo === undefined || ciudadExplicada.current) return
    ciudadExplicada.current = true
    navigate(appPaths.student.missions, { replace: true })
    openGuide(pasosBloqueo('CIUDAD', ciudadBloqueo))
  }, [zone, locked, ciudadBloqueo, navigate, openGuide])
  useEffect(() => {
    if (selectedPointId) {
      returnPoint.current = selectedPointId
      canvas.current?.focusPoint(selectedPointId)
    }
  }, [selectedPointId])
  function closePoint() {
    setParams(
      (current) => {
        const next = new URLSearchParams(current)
        next.delete('punto')
        return next
      },
      { replace: true },
    )
  }
  function selectPoint(id: string) {
    setMobilePanelOpen(false)
    canvas.current?.focusPoint(id)
    setParams((current) => {
      const next = new URLSearchParams(current)
      next.set('punto', id)
      next.delete('actividad')
      next.delete('revision')
      return next
    })
  }
  // Solo api: el siguiente paso se abre en su zona; si está en la otra, en el mapa de esa zona.
  function irSiguiente() {
    if (!siguiente || !('punto' in siguiente)) return
    if (siguiente.href) navigate(siguiente.href, { state: origen })
    else selectPoint(siguiente.punto.id)
  }
  // El mapa de origen viaja con la navegación: la Central de Casos vuelve a él al cerrar.
  const origen = { desde: zone === 'missions' ? 'camino' : 'ciudad' }
  function action(detail: PointDetails) {
    if (!accionDisponible(detail)) return
    if (detail.href) navigate(detail.href, { state: origen })
    else if (detail.activityId)
      setParams({ actividad: detail.activityId, ...(detail.revision ? { revision: '1' } : {}) })
  }
  function journal(detail: PointDetails) {
    if (!detail.journal) return
    const query = new URLSearchParams({
      activity: detail.journal.activityId,
      title: detail.journal.title,
      prompt: detail.journal.prompt,
    })
    navigate(`${appPaths.student.journal}?${query}`)
  }
  return {
    ui,
    navigate,
    canvas,
    frameAdditional,
    returnPoint,
    mobilePanelButton,
    selectedId,
    scale,
    setScale,
    minimumScale,
    setMinimumScale,
    openGuide,
    openCheckIn,
    announcementBlocked,
    mobilePanelOpen,
    setMobilePanelOpen,
    mobile,
    cityOpen,
    locked,
    recommended,
    siguiente,
    disponibles,
    irSiguiente,
    progress,
    selected,
    details,
    mostrarMisionesAdicionales,
    ciudadBloqueo,
    explicarCiudad,
    mostrarCiudadBloqueada,
    pasosAyuda,
    iniciales,
    closePoint,
    selectPoint,
    action,
    journal,
  }
}
