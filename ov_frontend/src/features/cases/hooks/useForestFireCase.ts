import { useEffect, useRef, useState } from 'react'

import { forestFirePhases } from '@/data/content/forestFireCase'

import { finishForestFireAttempt } from '@/features/cases/lib/forestFireCaseOutcome'
import { useAdventure, useAdventureStorageError } from '@/store/adventureStore'
import { useExplorationError } from '@/store/explorationStore'
import {
  FOREST_FIRE_BUDGET_LIMIT,
  SHOW_EXTRA_PROFESSIONAL,
  canOpenPhaseStep,
  createInitialAssignments,
  getBudgetSpent,
  toggleAssignment,
} from '@/features/cases/lib/forestFireCaseLogic'

type Screen =
  'phase-intro' | 'workspace' | 'result' | 'game-over' | 'report' | 'extra-question' | 'word-cloud'
export function useForestFireCase() {
  const [phaseIndex, setPhaseIndex] = useState(0)
  // The separate case intro already introduces phase 1.
  const [screen, setScreen] = useState<Screen>('workspace')
  const [step, setStep] = useState(0)
  const [assignments, setAssignments] = useState(createInitialAssignments)
  const [heardByPhase, setHeardByPhase] = useState<Record<string, string[]>>({})
  const [visitedByPhase, setVisitedByPhase] = useState<Record<string, number[]>>({})
  const [helpSeenByPhase, setHelpSeenByPhase] = useState<Record<string, boolean>>({})
  const [dragContactId, setDragContactId] = useState<string>()
  const [dropHovered, setDropHovered] = useState(false)
  const [newIconIds, setNewIconIds] = useState<string[]>([])
  const [extraProfessionalId, setExtraProfessionalId] = useState('')
  const [extraReason, setExtraReason] = useState('')
  const finalized = useRef(false)
  const main = useRef<HTMLElement>(null)
  const phase = forestFirePhases[phaseIndex]
  const heard = heardByPhase[phase.id] ?? []
  const visited = visitedByPhase[phase.id] ?? [0]
  const remaining = FOREST_FIRE_BUDGET_LIMIT - getBudgetSpent(assignments)
  const phaseAssignments = assignments[phase.id]
  const labels = ['Escuchar', ...phase.problems.map((_, i) => `Problema ${i + 1}`), 'Revisar']
  const adventure = useAdventure()
  const storageError = useAdventureStorageError()
  const explorationError = useExplorationError()
  useEffect(() => {
    main.current?.querySelector<HTMLElement>('h1')?.focus()
    window.scrollTo({ top: 0, behavior: 'instant' })
  }, [screen, step, phaseIndex])

  function goToStep(next: number) {
    if (!visited.includes(next) && !canOpenPhaseStep(phase, phaseAssignments, heard, next)) return
    setStep(next)
    setVisitedByPhase((current) => ({
      ...current,
      [phase.id]: [...new Set([...(current[phase.id] ?? [0]), next])],
    }))
  }
  function markHeard(ids: string[]) {
    setHeardByPhase((current) => ({
      ...current,
      [phase.id]: [...new Set([...(current[phase.id] ?? []), ...ids])],
    }))
  }
  function call(problemId: string, id: string) {
    setAssignments((current) =>
      current[phase.id][problemId].includes(id)
        ? current
        : toggleAssignment(current, phase.id, problemId, id),
    )
  }
  function restart() {
    finalized.current = false
    setPhaseIndex(0)
    setStep(0)
    setAssignments(createInitialAssignments())
    setHeardByPhase({})
    setVisitedByPhase({})
    setHelpSeenByPhase({})
    setDragContactId(undefined)
    setDropHovered(false)
    setNewIconIds([])
    setExtraProfessionalId('')
    setExtraReason('')
    setScreen('phase-intro')
  }
  function showReport() {
    if (!finalized.current) {
      finalized.current = true
      setNewIconIds(finishForestFireAttempt(assignments).newIconIds)
    }
    setScreen('report')
  }
  function advance() {
    if (phaseIndex < forestFirePhases.length - 1) {
      if (remaining < 1) {
        setScreen('game-over')
        return
      }
      setPhaseIndex((index) => index + 1)
      setStep(0)
      setScreen('phase-intro')
    } else if (SHOW_EXTRA_PROFESSIONAL) setScreen('extra-question')
    else showReport()
  }
  const complete = phase.problems.every((problem) => phaseAssignments[problem.id].length > 0)
  const isStepComplete = (index: number) =>
    index === 0
      ? phase.messages.every((m) => heard.includes(m.id))
      : index <= phase.problems.length && phaseAssignments[phase.problems[index - 1].id].length > 0
  return {
    phaseIndex,
    screen,
    setScreen,
    step,
    assignments,
    setAssignments,
    helpSeenByPhase,
    setHelpSeenByPhase,
    dragContactId,
    setDragContactId,
    dropHovered,
    setDropHovered,
    newIconIds,
    extraProfessionalId,
    setExtraProfessionalId,
    extraReason,
    setExtraReason,
    main,
    phase,
    heard,
    visited,
    remaining,
    phaseAssignments,
    labels,
    adventure,
    storageError,
    explorationError,
    goToStep,
    markHeard,
    call,
    restart,
    showReport,
    advance,
    complete,
    isStepComplete,
  }
}
