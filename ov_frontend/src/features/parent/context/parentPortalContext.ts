import { useOutletContext } from 'react-router'
import type { ParentActivitiesSource } from '../hooks/useParentActivities'

type ParentPortalContext = Omit<ParentActivitiesSource, 'completedIds'> & {
  completedActivityIds: string[]
}

function useParentPortalContext() {
  return useOutletContext<ParentPortalContext>()
}

export { useParentPortalContext }
export type { ParentPortalContext }
