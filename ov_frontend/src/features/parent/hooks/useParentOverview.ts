import { useEffect, useRef, useState } from 'react'
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
import { avanceConFamilia, nombreHijo } from '@/features/parent/lib/familia'
import { useResultadosHijo } from './useResultadosHijo'

import { usePrioritySettings } from '@/features/counselor/hooks/usePrioritySettings'
import { canAccessFamilyConversations, useAdventure } from '@/store/adventureStore'
import { familyConversationTopics, familyConversationDemoData } from '@/data/content/familyConversations'
import { modoApi } from '@/config/env'
import { useConversacionesApoderadoSeccion } from '@/store/servidor/apoderadoConversaciones'

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
  useEffect(() => {
    if (child && params.get('child') !== child.id) {
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
  // F08: en api, el avance de las conversaciones con el hijo activo (sin la sección abierta, ninguna).
  const servidor = useConversacionesApoderadoSeccion(modoApi).seccion.datos
  const conversation =
    modoApi && servidor
      ? {
          available: servidor.total,
          completed: servidor.completadas,
          pending: servidor.total - servidor.completadas,
        }
      : conversationSummary(
          familyConversationTopics,
          familyConversationDemoData,
          state.conversations,
          canAccessFamilyConversations(state),
        )
  const student = studentProfiles.find((s) => s.id === child?.id)
  const progress = student ? generalProgress(student, activities) : null
  // F03: en api, los resultados del hijo (con el diploma obtenido).
  const resultadosHijo = useResultadosHijo(familia)
  return {
    resultadosHijo,
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
    nombreHijo: nombreHijo(familia, student?.nombres),
    variosHijos: !familia && parentChildren.length > 1,
  }
}
