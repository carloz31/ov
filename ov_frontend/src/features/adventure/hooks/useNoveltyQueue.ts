import { useEffect, useMemo, useState } from 'react'
import { modoApi } from '@/config/env'
import { useEstadoServidor } from '@/store/servidor/sesion'
import { avisosPendientes, mostrarAviso } from '@/store/servidor/avisos'
import { marcarVistos } from '@/store/servidor/operaciones'

import { useNavigate } from 'react-router'
import { useAdventure } from '@/store/adventureStore'
import { useJourney } from '@/store/journeyStore'

import { cityArrivalSteps, guideSteps } from '@/data/content/guideTexts'
import { updateStudentUi, useStudentUi } from '@/store/studentUiStore'
import type { StudentView } from '@/lib/studentViews'

import { localDateKey, useCheckInDay } from '@/features/adventure/lib/checkIn'

import { getNextBadge } from '@/features/adventure/lib/unlocks'
import { useReflections } from '@/store/reflectionStore'
import { isWithinStudentDemo } from '@/config/studentDemoScope'
import {
  getNextOverlay,
  type AutomaticOverlay,
  type ManualOverlay,
} from '@/features/adventure/context/overlayContext'

export function useNoveltyQueue(view: StudentView, activityOpen: boolean) {
  const adventure = useAdventure()
  const journey = useJourney()
  const ui = useStudentUi()
  const reflections = useReflections()
  const navigate = useNavigate()
  const today = useCheckInDay()
  const servidor = useEstadoServidor()
  const [avisosManual, setAvisosManual] = useState(false)
  useEffect(() => {
    setAvisosManual(false)
  }, [servidor.resumen.datos?.cuenta.codigo])
  const [arrivalDismissed, setArrivalDismissed] = useState(false)
  const [automatic, setAutomatic] = useState<AutomaticOverlay | null>(null)
  const [manual, setManual] = useState<ManualOverlay | null>(null)
  const [overlayAbierto, setOverlayAbierto] = useState(false)
  useEffect(() => {
    if (!modoApi) return
    // Los detalles y menús usan portales: su presencia bloquea el mismo
    // criterio de anuncios que recibe getNextBadge, también fuera del mapa.
    const actualizar = () =>
      setOverlayAbierto(
        !!document.querySelector('[role="dialog"], [role="alertdialog"], [role="menu"], [role="listbox"]'),
      )
    actualizar()
    const observer = new MutationObserver(actualizar)
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['role', 'hidden', 'aria-hidden', 'data-state'],
    })
    return () => observer.disconnect()
  }, [])
  const next = getNextOverlay({ adventure, ui, view, activityOpen, arrivalDismissed })
  const nextKey =
    next?.kind === 'intro'
      ? `intro:${next.view}`
      : next?.kind === 'check-in'
        ? `check-in:${next.day}`
        : (next?.kind ?? '')
  useEffect(() => {
    // Opening only after mounting keeps static route rendering free of dialogs.
    setAutomatic(getNextOverlay({ adventure, ui, view, activityOpen, arrivalDismissed }))
  }, [adventure, ui, view, activityOpen, arrivalDismissed, today, nextKey])
  const active = activityOpen ? null : (manual ?? automatic)
  const announcementBlocked = activityOpen || overlayAbierto || !!active || !!next
  const context = useMemo(
    () => ({
      announcementBlocked,
      openServerNotices: () => setAvisosManual(true),
      openGuide: (steps: string[]) => setManual({ kind: 'guide', steps }),
      openCheckIn: (onReturnFocus?: () => void) => setManual({ kind: 'signal', onReturnFocus }),
    }),
    [announcementBlocked],
  )
  const additionalPending =
    !modoApi &&
    view === 'missions' &&
    (reflections.desbloqueos.some((d) => !d.visto && isWithinStudentDemo(d.actividadId)) ||
      (!!reflections.anuncioAdicional && isWithinStudentDemo(reflections.anuncioAdicional.actividadId)))
  const badge = modoApi
    ? undefined
    : getNextBadge(adventure, ui, activityOpen, announcementBlocked || additionalPending, journey)
  const habilitarAvisos =
    modoApi && !announcementBlocked && (view === 'missions' || view === 'central' || avisosManual)
  const aviso = habilitarAvisos && !servidor.errorAvisos ? avisosPendientes()[0] : undefined
  useEffect(() => {
    if (
      habilitarAvisos &&
      !aviso &&
      servidor.avisosMostrados.length &&
      !servidor.procesandoAvisos &&
      !servidor.errorAvisos
    ) {
      void marcarVistos().then((r) => {
        if (r.tipo === 'ok' && r.datos === 'terminado') setAvisosManual(false)
      })
    }
  }, [habilitarAvisos, aviso, servidor.avisosMostrados, servidor.procesandoAvisos, servidor.errorAvisos])
  const guide =
    active?.kind === 'guide'
      ? active.steps
      : active?.kind === 'intro'
        ? guideSteps[active.view]
        : active?.kind === 'arrival'
          ? cityArrivalSteps
          : null
  function closeGuide() {
    if (active?.kind === 'guide') {
      setManual(null)
      return
    }
    if (active?.kind === 'intro') {
      const closedView = active.view
      updateStudentUi((current) => ({
        ...current,
        introsSeen: { ...current.introsSeen, [closedView]: true },
      }))
    }
    // Closing arrival without finishing dismisses only this visit; the final action records it.
    if (active?.kind === 'arrival') setArrivalDismissed(true)
    setAutomatic(null)
  }
  function dismissSignal() {
    updateStudentUi((current) => ({ ...current, checkInPromptDismissedOn: localDateKey(new Date()) }))
    setManual(null)
    setAutomatic(null)
  }
  return {
    adventure,
    navigate,
    today,
    setManual,
    setAutomatic,
    active,
    context,
    badge,
    aviso,
    guide,
    closeGuide,
    dismissSignal,
    mostrarAviso,
    marcarVistos,
    errorAvisos: habilitarAvisos ? servidor.errorAvisos : null,
  }
}
