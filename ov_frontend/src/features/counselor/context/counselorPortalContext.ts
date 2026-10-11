import { createContext, useContext, type Dispatch } from 'react'
import type { CounselorAction, CounselorPortalState } from '../types'

type CounselorContextValue = { state: CounselorPortalState; dispatch: Dispatch<CounselorAction> }
export const CounselorContext = createContext<CounselorContextValue | null>(null)

export function useCounselorPortal() {
  const context = useContext(CounselorContext)
  if (!context) throw new Error('useCounselorPortal must be used within CounselorPortalProvider')
  return context
}
