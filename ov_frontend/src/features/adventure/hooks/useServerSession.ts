import { useResumenServidor, useActividadesServidor, errorSeccionesActivas } from '@/store/servidor/secciones'
import { useEffect } from 'react'
import { modoApi } from '@/config/env'
import { ingresar } from '@/store/servidor/operaciones'
import { useEstadoServidor } from '@/store/servidor/sesion'
import { refrescar } from '@/store/servidor/refresco'
import { useLocation } from 'react-router'
import { useJourney } from '@/store/journeyStore'
import { useOccupationExplorationContext } from '@/context/occupationExplorationContext'
import { completeMission, useAdventure, useAdventureStorageError } from '@/store/adventureStore'
import { updateDiscovery } from '@/store/discoveryStore'
import { recordBadgeFirstSeenAt } from '@/features/discovery/lib/passport'
import { getMissionsToSync } from '@/features/adventure/lib/missionSync'
import { seedStudentUnlocks } from '@/features/adventure/lib/unlocks'
import { updateStudentUi } from '@/store/studentUiStore'
import { getStudentView } from '@/lib/studentViews'
export function useServerSession() {
  const location = useLocation()
  const context = useOccupationExplorationContext()
  const adventure = useAdventure()
  useResumenServidor()
  useActividadesServidor()
  const servidor = useEstadoServidor()
  const journey = useJourney()
  const { completedMissionIds } = adventure
  const { progress } = journey
  const storageError = useAdventureStorageError()
  const view = getStudentView(location.pathname)
  const isMap = view === 'missions' || view === 'central'
  const activityOpen = new URLSearchParams(location.search).has('actividad')

  useEffect(() => {
    if (modoApi) void ingresar()
  }, [])

  useEffect(() => {
    if (modoApi) return
    getMissionsToSync({ completedMissionIds }, { progress }).forEach((id) => completeMission(id))
  }, [progress, completedMissionIds])

  useEffect(() => {
    if (modoApi) return
    // Existing v2 completions belong to the initial seed, after their legacy synchronization.
    if (getMissionsToSync(adventure, journey).length) return
    updateStudentUi((current) => seedStudentUnlocks(current, adventure, journey))
  }, [adventure, journey])

  useEffect(() => {
    if (
      (view === 'missions' || view === 'central') &&
      new URLSearchParams(location.search).has('actividad')
    ) {
      updateStudentUi((current) => (current.lastMap === view ? current : { ...current, lastMap: view }))
    }
  }, [view, location.search])

  useEffect(() => {
    if (modoApi) return
    updateDiscovery((current) => recordBadgeFirstSeenAt(current, adventure, undefined, journey))
  }, [adventure, journey])

  return {
    context,
    storageError,
    view,
    isMap,
    activityOpen,
    esperandoIngreso: modoApi && (!servidor.actividades.datos || !servidor.resumen.datos),
    errorIngreso: servidor.error,
    errorConsulta: modoApi ? (servidor.error ?? errorSeccionesActivas()) : null,
    cargando: servidor.cargando,
    reintentarIngreso: ingresar,
    reintentarConsulta: refrescar,
  }
}
