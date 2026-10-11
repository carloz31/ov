import type { Dispatch, SetStateAction } from 'react'
import { useOutletContext } from 'react-router'
import type { OccupationProfile } from '@/types/catalog'
import type { DecisionSheet } from '@/types/decisions'

type OccupationExplorationContext = {
  achievementIds: string[]
  careerInterestIds: string[]
  decisionSheets: DecisionSheet[]
  institutionInterestIds: string[]
  profiles: OccupationProfile[]
  setDecisionSheets: Dispatch<SetStateAction<DecisionSheet[]>>
  toggleCareerInterest: (careerId: string) => void
  toggleInstitutionInterest: (institutionId: string) => void
  toggleOccupationInterest: (occupationId: string) => void
}

function useOccupationExplorationContext() {
  return useOutletContext<OccupationExplorationContext>()
}

export { useOccupationExplorationContext }
export type { OccupationExplorationContext }
