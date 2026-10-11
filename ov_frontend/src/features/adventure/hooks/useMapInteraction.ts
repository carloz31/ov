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
    progress,
    selected,
    details,
    selectedPointId,
    accionDisponible,
    mostrarMisionesAdicionales,
    reintentarRequisito,
  } = useMapScreen({ zone, points, adventure, journey, selectedId })
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
  function action(detail: PointDetails) {
    if (!accionDisponible(detail)) return
    if (detail.href) navigate(detail.href)
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
    progress,
    selected,
    details,
    mostrarMisionesAdicionales,
    reintentarRequisito,
    closePoint,
    selectPoint,
    action,
    journal,
  }
}
