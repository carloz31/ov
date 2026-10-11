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
}: {
  adventure: AdventureState
  ui: StudentUiState
  view: StudentView
  activityOpen: boolean
  arrivalDismissed?: boolean
  now?: Date
}): AutomaticOverlay | null {
  // Discovery pages open unobstructed; their help is available from the header.
  if (activityOpen || isDiscoveryView(view)) return null
  if (isCityUnlocked(adventure) && !ui.cityArrivalSeen && !arrivalDismissed) return { kind: 'arrival' }
  if (!ui.introsSeen[view]) return { kind: 'intro', view }
  const day = localDateKey(now)
  if (!getTodayCheckIn(adventure, now) && ui.checkInPromptDismissedOn !== day)
    return { kind: 'check-in', day }
  return null
}

export const StudentOverlayContext = createContext({
  announcementBlocked: false,
  openServerNotices: () => {},
  openGuide: (_steps: string[]) => {},
  openCheckIn: (_onReturnFocus?: () => void) => {},
})
export const useStudentOverlays = () => useContext(StudentOverlayContext)
