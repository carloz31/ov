import { appPaths } from '@/routes/paths'
import type { StudentMapPoint } from './mapPoints'

export const studentActivitiesPath = '/student/activities'

export function getPointMapHref(point: StudentMapPoint) {
  const path = point.zone === 'camino' ? appPaths.student.missions : appPaths.student.exploration
  return `${path}?${new URLSearchParams({ punto: point.id })}`
}

export function getListedActivities(points: StudentMapPoint[], completed: boolean) {
  return points.filter(
    (point) =>
      point.id !== 'city' &&
      (completed ? point.status === 'completed' : point.status === 'available' && point.actionEnabled),
  )
}
