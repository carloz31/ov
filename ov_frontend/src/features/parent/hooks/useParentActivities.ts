import { useEffect, useMemo } from 'react'
import { modoApi } from '@/config/env'
import { parentActivities } from '@/data/activities/content'
import { parentAccountId, useParentJourney } from '@/store/parentJourneyStore'
import { ingresarApoderado, useEstadoApoderado } from '@/store/servidor/apoderado'
import { avisarContenidoFaltante } from '@/store/servidor/contenidos'
import { actividadesApoderado, completadasApoderado, disponiblesApoderado } from '@/lib/servidor/contenidos'
import { completedParentActivities, parentActivityAvailable } from '../lib/missionLogic'
import type { Actividad, JourneyState } from '@/types/activities'
import type { ErrorServidor } from '@/types/servidor'

export type ParentActivitiesSource = {
  activities: Actividad[]
  accountId: string
  journey: JourneyState
  completedIds: string[]
  available: (activity: Actividad) => boolean
  loading: boolean
  error: ErrorServidor | null
  serverCompletion: boolean
}

export function useParentActivities(): ParentActivitiesSource {
  const almacen = useEstadoApoderado()
  const accountId = modoApi ? (almacen.cuenta ?? '') : parentAccountId
  const journey = useParentJourney(accountId)
  const bloques = almacen.actividades.datos
  const contenido = useMemo(() => actividadesApoderado(bloques), [bloques])
  const disponibles = useMemo(() => disponiblesApoderado(bloques), [bloques])
  useEffect(() => {
    if (modoApi) void ingresarApoderado()
  }, [])
  useEffect(() => {
    if (!modoApi) return
    for (const codigo of contenido.sinContenido) {
      const actividad = bloques?.flatMap((b) => b.actividades).find((a) => a.codigo === codigo)
      if (actividad) avisarContenidoFaltante(codigo, actividad.contenido)
    }
  }, [bloques, contenido])
  return {
    activities: modoApi ? contenido.actividades : parentActivities,
    accountId,
    journey,
    completedIds: modoApi
      ? completadasApoderado(bloques)
      : completedParentActivities(parentActivities, journey),
    available: modoApi
      ? (activity) => disponibles.has(activity.id)
      : (activity) => parentActivityAvailable(activity, journey),
    loading: modoApi && (!almacen.cuenta || almacen.actividades.estado !== 'listo'),
    error: modoApi ? (almacen.error ?? almacen.actividades.error) : null,
    serverCompletion: modoApi,
  }
}
