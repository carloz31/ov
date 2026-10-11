import { forestFirePhases, forestFireProfessionals } from '@/data/content/forestFireCase'
import type { AdventureState } from '@/types/adventure'
import type { ForestFireAssignments, ForestFirePhase, ForestFireProblem } from '@/types/cases'

const FOREST_FIRE_BUDGET_LIMIT = 16
const FOREST_FIRE_MAX_SATISFACTION = forestFirePhases.reduce(
  (total, phase) =>
    total +
    phase.problems.reduce((phaseTotal, problem) => phaseTotal + problem.expectedProfessionalIds.length, 0),
  0,
)
const FOREST_FIRE_PASS_SCORE = 10
const SHOW_EXTRA_PROFESSIONAL = false

function createInitialAssignments(): ForestFireAssignments {
  return Object.fromEntries(
    forestFirePhases.map((phase) => [
      phase.id,
      Object.fromEntries(phase.problems.map((problem) => [problem.id, []])),
    ]),
  )
}

function toggleAssignment(
  assignments: ForestFireAssignments,
  phaseId: string,
  problemId: string,
  professionalId: string,
) {
  const selected = assignments[phaseId]?.[problemId]
  if (!selected || !forestFireProfessionals.some((p) => p.id === professionalId)) return assignments
  if (!selected.includes(professionalId) && getBudgetSpent(assignments) >= FOREST_FIRE_BUDGET_LIMIT)
    return assignments
  return {
    ...assignments,
    [phaseId]: {
      ...assignments[phaseId],
      [problemId]: selected.includes(professionalId)
        ? selected.filter((id) => id !== professionalId)
        : [...selected, professionalId],
    },
  }
}

function canOpenPhaseStep(
  phase: ForestFirePhase,
  assignments: Record<string, string[]>,
  heard: string[],
  step: number,
) {
  if (step === 0) return true
  if (!phase.messages.every((message) => heard.includes(message.id))) return false
  return (
    step <= phase.problems.length + 1 &&
    phase.problems.slice(0, step - 1).every((problem) => (assignments[problem.id]?.length ?? 0) > 0)
  )
}

function getCorrectOccupationIds(assignments: ForestFireAssignments) {
  return [
    ...new Set(
      forestFirePhases.flatMap((phase) =>
        phase.problems.flatMap((problem) =>
          problem.expectedProfessionalIds
            .filter((id) => assignments[phase.id]?.[problem.id]?.includes(id))
            .map((id) => forestFireProfessionals.find((p) => p.id === id)?.occupationId)
            .filter((id): id is string => !!id),
        ),
      ),
    ),
  ]
}

function getBudgetSpent(assignments: ForestFireAssignments) {
  return Object.values(assignments)
    .flatMap((phaseAssignments) => Object.values(phaseAssignments))
    .reduce((total, professionalIds) => total + professionalIds.length, 0)
}

function getProblemSatisfaction(problem: ForestFireProblem, selectedIds: string[]) {
  return problem.expectedProfessionalIds.filter((professionalId) => selectedIds.includes(professionalId))
    .length
}

function getPhaseSatisfaction(phase: ForestFirePhase, assignments: Record<string, string[]>) {
  return phase.problems.reduce(
    (total, problem) => total + getProblemSatisfaction(problem, assignments[problem.id] ?? []),
    0,
  )
}

function getTotalSatisfaction(assignments: ForestFireAssignments) {
  return forestFirePhases.reduce(
    (total, phase) => total + getPhaseSatisfaction(phase, assignments[phase.id] ?? {}),
    0,
  )
}

function getForestFireCaseStatus(adventure: Pick<AdventureState, 'solvedCaseIds' | 'caseBestScores'>) {
  const score = adventure.caseBestScores?.['forest-fire']
  const passed = adventure.solvedCaseIds.includes('forest-fire')
  return {
    score,
    passed,
    badge: passed ? 'Superado' : score !== undefined ? 'En progreso' : 'Disponible',
    actionLabel: passed ? 'Jugar de nuevo' : score !== undefined ? 'Intentar de nuevo' : 'Iniciar',
  }
}

export {
  getForestFireCaseStatus,
  FOREST_FIRE_BUDGET_LIMIT,
  FOREST_FIRE_MAX_SATISFACTION,
  FOREST_FIRE_PASS_SCORE,
  SHOW_EXTRA_PROFESSIONAL,
  createInitialAssignments,
  toggleAssignment,
  canOpenPhaseStep,
  getCorrectOccupationIds,
  getBudgetSpent,
  getPhaseSatisfaction,
  getProblemSatisfaction,
  getTotalSatisfaction,
}
