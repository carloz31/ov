import { useEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'react-router'

import { parentChildren } from '@/features/parent/data/parentPortal'

import { useParentPortalContext } from '@/features/parent/context/parentPortalContext'
import {
  conversationSummary,
  familySharedIds,
  parentRoute,
  selectedFamilyChild,
} from '@/features/parent/lib/selectors'
import { activities, questionnaires, studentProfiles } from '@/data/demo/studentProfiles'
import { generalProgress } from '@/features/student-tracking/lib/selectors'
import { avanceConFamilia, hijoElegido, nombreHijo } from '@/features/parent/lib/familia'
import { estadoConversaciones } from '@/features/parent/lib/inicio'
import { useResultadosHijo } from './useResultadosHijo'

import { usePrioritySettings } from '@/features/counselor/hooks/usePrioritySettings'
import { canAccessFamilyConversations, useAdventure } from '@/store/adventureStore'
import { familyConversationTopics, familyConversationDemoData } from '@/data/content/familyConversations'
import { modoApi } from '@/config/env'
import {
  elegirHijo,
  hijoActivo,
  reintentarConversacionesApoderado,
  useConversacionesApoderadoSeccion,
} from '@/store/servidor/apoderadoConversaciones'

export function useParentOverview() {
  const mainRef = useRef<HTMLElement>(null)
  const diplomaRef = useRef<HTMLDivElement>(null)
  const [highlightDiploma, setHighlightDiploma] = useState(false)
  useEffect(() => {
    mainRef.current?.scrollIntoView({ block: 'start' })
  }, [])
  const {
    completedActivityIds,
    activities: parentRouteActivities,
    available,
    familia,
  } = useParentPortalContext()
  const state = useAdventure()
  const settings = usePrioritySettings()
  const [params, setParams] = useSearchParams()
  const child = selectedFamilyChild(parentChildren, params.get('child'))
  // Ajuste inicio-apoderado: en api, los hijos del servidor; el elegido es el mismo de Conversaciones
  // (`hijoActivo`) y se refleja en `?child=`. Una URL con un hijo vinculado lo elige.
  const hijos = useMemo(() => (modoApi ? (familia?.estudiantes ?? []) : []), [familia])
  const seccionConversaciones = useConversacionesApoderadoSeccion(modoApi && hijos.length > 0)
  const hijo = hijoElegido(familia, seccionConversaciones.hijo ?? hijoActivo())
  const pedido = params.get('child')
  useEffect(() => {
    if (!modoApi || !hijo) return
    if (pedido && pedido !== hijo.codigo && hijos.some((h) => h.codigo === pedido)) elegirHijo(pedido)
    else if (pedido !== hijo.codigo) {
      const next = new URLSearchParams(params)
      next.set('child', hijo.codigo)
      setParams(next, { replace: true })
    }
  }, [hijo, hijos, pedido, params, setParams])
  useEffect(() => {
    if (!modoApi && child && params.get('child') !== child.id) {
      const next = new URLSearchParams(params)
      next.set('child', child.id)
      setParams(next, { replace: true })
    }
  }, [child, params, setParams])
  const route = avanceConFamilia(
    parentRoute(parentRouteActivities, parentChildren, completedActivityIds, available),
    familia,
  )
  const requestedDiploma = params.get('diploma') === '1'
  useEffect(() => {
    if (!requestedDiploma || !route.complete) return
    diplomaRef.current?.focus({ preventScroll: true })
    diplomaRef.current?.scrollIntoView({ block: 'center' })
    setHighlightDiploma(true)
    const timer = window.setTimeout(() => setHighlightDiploma(false), 2000)
    return () => window.clearTimeout(timer)
  }, [requestedDiploma, route.complete])
  const shared = questionnaires.filter((q) => familySharedIds(settings).includes(q.id))
  // Solo local: el resumen de conversaciones de demostración (en api, la tarjeta lee la sección del hijo).
  const conversation = conversationSummary(
    familyConversationTopics,
    familyConversationDemoData,
    state.conversations,
    canAccessFamilyConversations(state),
  )
  const student = studentProfiles.find((s) => s.id === child?.id)
  const progress = student ? generalProgress(student, activities) : null
  // F03: en api, los resultados del hijo elegido (con el diploma obtenido).
  const resultadosHijo = useResultadosHijo(familia, hijo?.codigo)
  return {
    resultadosHijo,
    // Ajuste inicio-apoderado: el Inicio del servidor (solo api); en local, null y las vistas de siempre.
    inicio: modoApi
      ? {
          familia,
          hijos,
          hijo,
          elegir: (codigo: string) => {
            elegirHijo(codigo)
            const next = new URLSearchParams(params)
            next.set('child', codigo)
            setParams(next, { replace: true })
          },
          conversaciones: estadoConversaciones(seccionConversaciones.seccion),
          reintentarConversaciones: () => void reintentarConversacionesApoderado(),
        }
      : null,
    mainRef,
    diplomaRef,
    highlightDiploma,
    completedActivityIds,
    params,
    setParams,
    child,
    route,
    shared,
    conversation,
    student,
    progress,
    // Solo api: el hijo y el avance del servidor; las vistas dejan los datos de demostración.
    familia,
    nombreHijo: nombreHijo(familia, student?.nombres, hijo?.codigo),
    variosHijos: !modoApi && parentChildren.length > 1,
  }
}
