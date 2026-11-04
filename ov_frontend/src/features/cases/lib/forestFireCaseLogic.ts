import { forestFirePhases, forestFireProfessionals } from '@/data/content/forestFireCase'
import type { AdventureState } from '@/types/adventure'
import { getExplorationImagePath } from '@/lib/explorationAssets'
import type { CasoJugable, ForestFireAssignments, ForestFirePhase, ForestFireProblem } from '@/types/cases'

const FOREST_FIRE_BUDGET_LIMIT = 16
const FOREST_FIRE_MAX_SATISFACTION = forestFirePhases.reduce(
  (total, phase) =>
    total +
    phase.problems.reduce((phaseTotal, problem) => phaseTotal + problem.expectedProfessionalIds.length, 0),
  0,
)
const FOREST_FIRE_PASS_SCORE = 10
const SHOW_EXTRA_PROFESSIONAL = false

// Ajuste carga-casos: el incendio forestal es el caso del modo local (congelado). Cada función recibe el caso; sin
// él, juega este. En api, el caso sale de su JSON con la escala del servidor (`casoDesdeJson`).
const CASO_LOCAL: CasoJugable = {
  id: 'forest-fire',
  titulo: 'Incendio forestal',
  tematica: '',
  intro: {
    narrativa: [
      'Durante la madrugada, un incendio forestal se originó en las colinas cercanas a una pequeña localidad rural. Impulsado por el viento y la vegetación seca de la temporada, el fuego avanza sin control, amenazando viviendas, caminos y a las familias que viven en la zona. La comunidad ha dado la voz de alerta y ha solicitado apoyo urgente.',
      'Tú has sido designado como coordinador de respuesta ante la emergencia.',
    ],
    imagen: getExplorationImagePath('forest-fire-case-background.png'),
    alerta: 'Emergencia activa',
    llama: true,
  },
  presupuesto: FOREST_FIRE_BUDGET_LIMIT,
  minimo: FOREST_FIRE_PASS_SCORE,
  maximo: FOREST_FIRE_MAX_SATISFACTION,
  phases: forestFirePhases,
  professionals: forestFireProfessionals,
}

function createInitialAssignments(caso: CasoJugable = CASO_LOCAL): ForestFireAssignments {
  return Object.fromEntries(
    caso.phases.map((phase) => [
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
  caso: CasoJugable = CASO_LOCAL,
) {
  const selected = assignments[phaseId]?.[problemId]
  if (!selected || !caso.professionals.some((p) => p.id === professionalId)) return assignments
  if (!selected.includes(professionalId) && getBudgetSpent(assignments) >= caso.presupuesto)
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

function getCorrectOccupationIds(assignments: ForestFireAssignments, caso: CasoJugable = CASO_LOCAL) {
  return [
    ...new Set(
      caso.phases.flatMap((phase) =>
        phase.problems.flatMap((problem) =>
          problem.expectedProfessionalIds
            .filter((id) => assignments[phase.id]?.[problem.id]?.includes(id))
            .map((id) => caso.professionals.find((p) => p.id === id)?.occupationId)
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

function getTotalSatisfaction(assignments: ForestFireAssignments, caso: CasoJugable = CASO_LOCAL) {
  return caso.phases.reduce(
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
  CASO_LOCAL,
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
