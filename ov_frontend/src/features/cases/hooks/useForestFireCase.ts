import { useEffect, useRef, useState } from 'react'
import { modoApi } from '@/config/env'
import { forestFirePhases } from '@/data/content/forestFireCase'
import { dimensionNames } from '@/features/discovery/lib/catalogDetails'
import { getOccupation } from '@/features/discovery/lib/catalogSelectors'
import {
  puntajeCaso,
  superaCaso,
  textoPuntajeCaso,
  textoTiposCaso,
} from '@/lib/servidor/adaptadoresCasos'
import { consultarCasos, resolverCaso } from '@/store/servidor/casos'
import { mensajeErrorServidor } from '@/store/servidor/sesion'
import type { OcupacionNueva } from '@/types/servidor'

import { finishForestFireAttempt } from '@/features/cases/lib/forestFireCaseOutcome'
import { useAdventure, useAdventureStorageError } from '@/store/adventureStore'
import { useExplorationError } from '@/store/explorationStore'
import {
  FOREST_FIRE_BUDGET_LIMIT,
  FOREST_FIRE_MAX_SATISFACTION,
  getCorrectOccupationIds,
  getTotalSatisfaction,
  SHOW_EXTRA_PROFESSIONAL,
  canOpenPhaseStep,
  createInitialAssignments,
  getBudgetSpent,
  toggleAssignment,
} from '@/features/cases/lib/forestFireCaseLogic'

type Screen =
  'phase-intro' | 'workspace' | 'result' | 'game-over' | 'report' | 'extra-question' | 'word-cloud'
// Resultado del intento según el servidor (F04): el umbral es el del caso.
export type ResultadoCasoServidor = { superado: boolean; puntaje: string; tipos: string; mejor: number }
// Con `actividad` (api), cada intento terminado se envía a resolver-caso.
export function useForestFireCase({ actividad }: { actividad?: string } = {}) {
  const conServidor = modoApi && !!actividad
  const [enviando, setEnviando] = useState(false)
  const [errorEnvio, setErrorEnvio] = useState('')
  const [resultadoServidor, setResultadoServidor] = useState<ResultadoCasoServidor>()
  const [phaseIndex, setPhaseIndex] = useState(0)
  // The separate case intro already introduces phase 1.
  const [screen, setScreen] = useState<Screen>('workspace')
  const [step, setStep] = useState(0)
  const [assignments, setAssignments] = useState(createInitialAssignments)
  const [heardByPhase, setHeardByPhase] = useState<Record<string, string[]>>({})
  const [visitedByPhase, setVisitedByPhase] = useState<Record<string, number[]>>({})
  const [dragContactId, setDragContactId] = useState<string>()
  const [dropHovered, setDropHovered] = useState(false)
  // Íconos nuevos con su nombre: del servidor en api, del catálogo del front en local.
  const [newIcons, setNewIcons] = useState<OcupacionNueva[]>([])
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
    main.current?.scrollTo({ top: 0, behavior: 'instant' })
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
    setDragContactId(undefined)
    setDropHovered(false)
    setNewIcons([])
    setExtraProfessionalId('')
    setExtraReason('')
    setErrorEnvio('')
    setResultadoServidor(undefined)
    setScreen('phase-intro')
  }
  // Envía el intento y lee el caso actualizado; sin respuesta válida, el intento no se da por cerrado.
  async function enviarIntento(puntaje: number, ocupaciones: string[]) {
    setEnviando(true)
    setErrorEnvio('')
    const respuesta = await resolverCaso(actividad!, puntaje, ocupaciones)
    const casos = respuesta.tipo === 'ok' || respuesta.tipo === 'guardado_sin_refrescar' ? await consultarCasos() : null
    setEnviando(false)
    const caso = casos?.tipo === 'ok' ? casos.datos.find((c) => c.actividad === actividad) : undefined
    if (respuesta.tipo !== 'ok' && respuesta.tipo !== 'guardado_sin_refrescar') {
      setErrorEnvio(mensajeErrorServidor(respuesta))
      return undefined
    }
    if (!caso) {
      setErrorEnvio(casos && casos.tipo !== 'ok' ? mensajeErrorServidor(casos) : 'No se encontró el caso.')
      return undefined
    }
    return { datos: respuesta.datos, caso }
  }
  async function showReport() {
    if (enviando) return
    if (!finalized.current && conServidor) {
      const puntaje = puntajeCaso(getTotalSatisfaction(assignments), FOREST_FIRE_MAX_SATISFACTION)
      const envio = await enviarIntento(puntaje, getCorrectOccupationIds(assignments))
      if (!envio) return
      finalized.current = true
      setNewIcons(envio.datos.ocupaciones_nuevas)
      setResultadoServidor({
        superado: superaCaso(puntaje, envio.caso),
        puntaje: textoPuntajeCaso(puntaje, envio.caso),
        tipos: textoTiposCaso(envio.caso, dimensionNames),
        mejor: Math.round(((envio.caso.mejor_puntaje ?? 0) * FOREST_FIRE_MAX_SATISFACTION) / 100),
      })
    } else if (!finalized.current) {
      finalized.current = true
      setNewIcons(
        finishForestFireAttempt(assignments).newIconIds.map((codigo) => ({
          codigo,
          titulo: getOccupation(codigo)?.name ?? codigo,
        })),
      )
    }
    setScreen('report')
  }
  async function advance() {
    if (phaseIndex < forestFirePhases.length - 1) {
      if (remaining < 1) {
        // El presupuesto agotado cuenta como intento fallido, con puntaje 0.
        if (conServidor && !finalized.current) {
          if (enviando || !(await enviarIntento(0, []))) return
          finalized.current = true
        }
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
    dragContactId,
    setDragContactId,
    dropHovered,
    setDropHovered,
    newIcons,
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
    enviando,
    errorEnvio,
    resultadoServidor,
    complete,
    isStepComplete,
  }
}
