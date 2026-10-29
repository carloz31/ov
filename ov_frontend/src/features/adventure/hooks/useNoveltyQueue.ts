import { useEffect, useMemo, useState } from 'react'
import { modoApi } from '@/config/env'
import { useEstadoServidor } from '@/store/servidor/sesion'
import { marcarPresentacionVista } from '@/store/servidor/operaciones'
import {
  cargarNotificaciones,
  marcarNotificacionesVistas,
  useNotificaciones,
} from '@/store/servidor/notificaciones'
import { notificacionLegible } from '@/lib/servidor/adaptadoresNotificaciones'

import { useNavigate } from 'react-router'
import { useAdventure } from '@/store/adventureStore'
import { useJourney } from '@/store/journeyStore'

import { cityArrivalSteps, sectionIntros } from '@/data/content/guideTexts'
import { updateStudentUi, useStudentUi } from '@/store/studentUiStore'
import { useFichaEnPantalla } from '@/store/visorRecursoStore'
import type { StudentView } from '@/lib/studentViews'

import { localDateKey, useCheckInDay } from '@/features/adventure/lib/checkIn'
import { useSenalServidor } from '@/features/adventure/hooks/useSenalServidor'
import { useSeccionesAcceso, type CodigoSeccion } from '@/features/adventure/hooks/useSeccionesAcceso'

import { getNextBadge } from '@/features/adventure/lib/unlocks'
import { useReflections } from '@/store/reflectionStore'
import { isWithinStudentDemo } from '@/config/studentDemoScope'
import {
  getNextOverlay,
  type AutomaticOverlay,
  type ManualOverlay,
} from '@/features/adventure/context/overlayContext'

// Vistas que `AppRoutes` envuelve en `SeccionProtegida`: con la sección cerrada se ve su tarjeta de bloqueo,
// no la sección, y la presentación no se muestra ni se marca como vista.
const seccionDeVista: Partial<Record<StudentView, CodigoSeccion>> = {
  journal: 'DIARIO',
  'journal-signals': 'CHECK_IN',
  'catalog-professions': 'CATALOGO',
  'catalog-careers': 'CATALOGO',
  'catalog-institutions': 'CATALOGO',
  'catalog-detail': 'CATALOGO',
  'profile-decisions': 'PLANES',
  conversations: 'FAMILIA',
  investigations: 'INVESTIGACIONES',
}

export function useNoveltyQueue(view: StudentView, activityOpen: boolean) {
  const adventure = useAdventure()
  const journey = useJourney()
  const uiLocal = useStudentUi()
  const reflections = useReflections()
  const navigate = useNavigate()
  const today = useCheckInDay()
  const servidor = useEstadoServidor()
  const senal = useSenalServidor()
  const checkInPendiente = senal.activo ? senal.pendiente : undefined
  const acceso = useSeccionesAcceso()
  const seccion = seccionDeVista[view]
  const seccionBloqueada = !!seccion && !!acceso(seccion).pasos
  // Presentaciones-vistas: en api, las presentaciones vistas son las del servidor más las cerradas en esta
  // visita (si su POST falla, vuelven a salir al recargar); sin datos del servidor, la presentación espera.
  const [cerradas, setCerradas] = useState<StudentView[]>([])
  const vistasServidor = servidor.presentaciones.datos?.vistas
  const ui = useMemo(
    () =>
      modoApi
        ? {
            ...uiLocal,
            introsSeen: Object.fromEntries([...(vistasServidor ?? []), ...cerradas].map((v) => [v, true])),
          }
        : uiLocal,
    [uiLocal, vistasServidor, cerradas],
  )
  const introEnEspera = seccionBloqueada || (modoApi && !vistasServidor)
  // F04d: con una ficha (o su requisito) abierta, p. ej. al entrar a la mochila con `?ficha=`, los avisos
  // automáticos esperan a que se cierre; como no llegan a mostrarse, tampoco se marcan como vistos.
  const fichaAbierta = useFichaEnPantalla()
  const notificaciones = useNotificaciones()
  useEffect(() => {
    setCerradas([])
  }, [servidor.resumen.datos?.cuenta.codigo])
  // Ajuste notificaciones: al volver al mapa se vuelve a pedir la campana (sin polling).
  useEffect(() => {
    if (modoApi && view === 'missions') void cargarNotificaciones()
  }, [view])
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
  const next = getNextOverlay({
    adventure,
    ui,
    view,
    activityOpen,
    arrivalDismissed,
    checkInPendiente,
    introEnEspera,
  })
  const nextKey =
    next?.kind === 'intro'
      ? `intro:${next.view}`
      : next?.kind === 'check-in'
        ? `check-in:${next.day}`
        : (next?.kind ?? '')
  useEffect(() => {
    // Opening only after mounting keeps static route rendering free of dialogs.
    setAutomatic(
      getNextOverlay({ adventure, ui, view, activityOpen, arrivalDismissed, checkInPendiente, introEnEspera }),
    )
  }, [adventure, ui, view, activityOpen, arrivalDismissed, today, nextKey, checkInPendiente, introEnEspera])
  const active = activityOpen ? null : (manual ?? (fichaAbierta ? null : automatic))
  const announcementBlocked = activityOpen || overlayAbierto || !!active || !!next
  const context = useMemo(
    () => ({
      announcementBlocked,
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
  // Ajuste notificaciones: los toasts son solo lo que llegó de acciones sin cierre, uno por vez; cada uno se marca
  // visto al cerrarlo, pulsarlo o vencer su tiempo.
  const habilitarAvisos = modoApi && !announcementBlocked && (view === 'missions' || view === 'central')
  const aviso = habilitarAvisos
    ? notificaciones.colaToast.map((n) => notificacionLegible(n)).find((a) => a !== null)
    : undefined
  const descartarAviso = (codigo: string) => void marcarNotificacionesVistas([codigo])
  const guide =
    active?.kind === 'guide'
      ? active.steps
      : active?.kind === 'intro'
        ? sectionIntros[active.view]
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
      if (modoApi) {
        setCerradas((current) => [...current, closedView])
        void marcarPresentacionVista(closedView)
      } else
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
    descartarAviso,
    senal,
  }
}
