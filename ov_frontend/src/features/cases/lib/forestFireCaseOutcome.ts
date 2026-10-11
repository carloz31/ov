import { completeCase, recordCaseScore } from '@/store/adventureStore'
import { unlockCaseOccupations } from '@/store/explorationStore'
import { FOREST_FIRE_PASS_SCORE, getCorrectOccupationIds, getTotalSatisfaction } from './forestFireCaseLogic'
import type { ForestFireAssignments } from '@/types/cases'

// Called once when entering the report; exiting and budget game-over do not finish an attempt.
export function finishForestFireAttempt(assignments: ForestFireAssignments) {
  const score = getTotalSatisfaction(assignments)
  const passed = score >= FOREST_FIRE_PASS_SCORE
  recordCaseScore('forest-fire', score)
  if (passed) completeCase('forest-fire')
  const newIconIds = passed ? unlockCaseOccupations(getCorrectOccupationIds(assignments)) : []
  return { score, passed, newIconIds }
}
