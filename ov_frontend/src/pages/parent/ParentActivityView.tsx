import { useParams, useSearchParams } from 'react-router'

import { useParentPortalContext } from '@/features/parent/context/parentPortalContext'

function ParentActivityView() {
  const { activityId } = useParams()
  const [params] = useSearchParams()
  const { activities, available, motivoBloqueo, journey: state, loading } = useParentPortalContext()
  const activity = activities.find((item) => item.id === activityId)
  if (loading) return null
  if (!activity || !available(activity))
    return <ActivityUnavailable locked={!!activity} mensaje={activity && motivoBloqueo(activity)} />
  return (
    <ParentActivitySession
      key={`${activity.id}/${params.get('repasar') ?? ''}`}
      activity={activity}
      review={params.get('repasar') === '1' && state.progress[activity.id]?.estado === 'completada'}
    />
  )
}
import { ParentActivitySession } from '@/features/parent/components/ParentActivitySession'

import { ActivityUnavailable } from '@/features/parent/components/ActivityUnavailable'
export { ParentActivityView }
