import { useEffect } from 'react'
import { Outlet, useLocation } from 'react-router'
import type { OccupationExplorationContext } from '@/context/occupationExplorationContext'
import { updateAdventure, useAdventure } from '@/store/adventureStore'
import { useExploration, setDecisionSheets, toggleCareerInterest, toggleInstitutionInterest, toggleOccupationInterest } from '@/store/explorationStore'

function OccupationExplorationModule() {
  const location = useLocation()
  const adventure = useAdventure()
  const { profiles, careerInterestIds, institutionInterestIds, decisionSheets } = useExploration()
  const hasInterests =
    profiles.some((profile) => profile.interested) ||
    careerInterestIds.length > 0 ||
    institutionInterestIds.length > 0
  const achievementIds = [
    ...(adventure.solvedCaseIds.length ? ['first-case'] : []),
    ...(hasInterests ? ['first-interest'] : []),
  ]

  useEffect(() => {
    const day = new Date().toLocaleDateString('en-CA')
    updateAdventure((current) =>
      current.visits.includes(day) ? current : { ...current, visits: [...current.visits, day] },
    )
  }, [])

  useEffect(() => {
    window.scrollTo({ top: 0 })
  }, [location.pathname])

  return (
    <Outlet
      context={
        {
          achievementIds,
          careerInterestIds,
          decisionSheets,
          institutionInterestIds,
          profiles,
          setDecisionSheets,
          toggleCareerInterest,
          toggleInstitutionInterest,
          toggleOccupationInterest,
        } satisfies OccupationExplorationContext
      }
    />
  )
}

export { OccupationExplorationModule }
