import type { JourneyState } from '@/types/activities'
import { fieldMissions, type FieldMission } from '@/data/content/adventure'
import type { AdventureState } from '@/types/adventure'
import { baseRoute } from '@/data/activities/reflectionConfig'
export const specActivityByMission: Partial<Record<FieldMission['id'], string>> =
  Object.fromEntries(baseRoute)

export function getMissionsToSync(
  adventure: Pick<AdventureState, 'completedMissionIds'>,
  journey: Pick<JourneyState, 'progress'>,
): FieldMission['id'][] {
  return fieldMissions
    .filter((mission) => {
      const activityId = specActivityByMission[mission.id]
      return (
        activityId &&
        journey.progress[activityId]?.estado === 'completada' &&
        !adventure.completedMissionIds.includes(mission.id)
      )
    })
    .map((mission) => mission.id)
}

export function missionComplete(mission: FieldMission, adventure: AdventureState, journey: JourneyState) {
  const specId = specActivityByMission[mission.id]
  return (
    adventure.completedMissionIds.includes(mission.id) ||
    (specId !== undefined && journey.progress[specId]?.estado === 'completada')
  )
}
