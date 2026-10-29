import { createContext, useContext } from 'react'
import { isCityUnlocked } from '@/store/adventureStore'
import type { AdventureState } from '@/types/adventure'
import type { StudentUiState } from '@/store/studentUiStore'
import { isDiscoveryView, type StudentView } from '@/lib/studentViews'
import { getTodayCheckIn, localDateKey } from '../lib/checkIn'

export type AutomaticOverlay =
  { kind: 'arrival' } | { kind: 'intro'; view: StudentView } | { kind: 'check-in'; day: string }
export type ManualOverlay =
  { kind: 'guide'; steps: string[] } | { kind: 'signal'; onReturnFocus?: () => void }

export function getNextOverlay({
  adventure,
  ui,
  view,
  activityOpen,
  arrivalDismissed = false,
  now = new Date(),
  checkInPendiente,
  introEnEspera = false,
}: {
  adventure: AdventureState
  ui: StudentUiState
  view: StudentView
  activityOpen: boolean
  arrivalDismissed?: boolean
  now?: Date
  // F05, solo api: lo decide el servidor (CHECK_IN abierta y sin check-in hoy); sin definir, la señal local.
  checkInPendiente?: boolean
  // Solo api: la sección de la vista está cerrada en el servidor, o aún no se sabe qué presentaciones se vieron
  // (presentaciones-vistas). Mientras tanto la cola no muestra nada en esa vista.
  introEnEspera?: boolean
}): AutomaticOverlay | null {
  if (activityOpen) return null
  // Discovery pages only present their purpose once; arrival and the daily signal wait for the maps.
  const discovery = isDiscoveryView(view)
  if (!discovery && isCityUnlocked(adventure) && !ui.cityArrivalSeen && !arrivalDismissed)
    return { kind: 'arrival' }
  if (!ui.introsSeen[view]) return introEnEspera ? null : { kind: 'intro', view }
  if (discovery) return null
  const day = localDateKey(now)
  const pendiente = checkInPendiente ?? !getTodayCheckIn(adventure, now)
  if (pendiente && ui.checkInPromptDismissedOn !== day) return { kind: 'check-in', day }
  return null
}

export const StudentOverlayContext = createContext({
  announcementBlocked: false,
  openGuide: (_steps: string[]) => {},
  openCheckIn: (_onReturnFocus?: () => void) => {},
})
export const useStudentOverlays = () => useContext(StudentOverlayContext)
