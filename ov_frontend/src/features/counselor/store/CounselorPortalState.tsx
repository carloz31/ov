import { useMemo, useReducer, type ReactNode } from 'react'
import { CounselorContext } from '../context/counselorPortalContext'
import { counselorReducer } from './counselorPortalReducer'
import { createCounselorPortalState } from '../data/counselorPortal'

export function CounselorPortalProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(counselorReducer, undefined, () => createCounselorPortalState())
  const value = useMemo(() => ({ state, dispatch }), [state])
  return <CounselorContext.Provider value={value}>{children}</CounselorContext.Provider>
}
