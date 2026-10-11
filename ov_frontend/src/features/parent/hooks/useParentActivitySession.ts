import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router'

import { catalog } from '@/data/activities/content'
import type { Actividad, IntentoPregunta } from '@/types/activities'

import { useParentActivities } from './useParentActivities'
import { completarActividadApoderado, obtenerEstadoApoderado } from '@/store/servidor/apoderado'
import { mensajeErrorServidor } from '@/store/servidor/sesion'
import { parentRoute } from '@/features/parent/lib/selectors'
import {
  advanceParentActivity,
  nextParentPendingNode,
  readyToCompleteOnServer,
  retreatParentActivity,
  startParentActivity,
} from '@/features/parent/lib/missionLogic'
import { updateParentJourney, useParentJourneyError } from '@/store/parentJourneyStore'

type PracticeAttempt = Pick<IntentoPregunta, 'opcionIds' | 'correcta' | 'revelada' | 'numeroIntento'>
export function useParentActivitySession(activity: Actividad, review: boolean) {
  const navigate = useNavigate()
  const {
    activities,
    available,
    accountId,
    journey: state,
    completedIds,
    serverCompletion,
  } = useParentActivities()
  const disponible = available(activity)
  const opciones = { disponible, servidor: serverCompletion }
  const storageError = useParentJourneyError()
  const [serverError, setServerError] = useState('')
  const enviando = useRef(false)
  const montado = useRef(true)
  const [nodeId, setNodeId] = useState(() =>
    review
      ? activity.nodos[0]?.id
      : (nextParentPendingNode(activity, state)?.id ??
        (serverCompletion && state.progress[activity.id]?.estado !== 'completada'
          ? activity.nodos.at(-1)?.id
          : undefined)),
  )
  const [optionId, setOptionId] = useState<string>()
  const [resources, setResources] = useState<string[]>([])
  const [practice, setPractice] = useState<Record<string, PracticeAttempt[]>>({})
  const [entrance, setEntrance] = useState({ transition: false, resource: true })
  const [celebrate, setCelebrate] = useState(
    () =>
      serverCompletion &&
      !review &&
      state.progress[activity.id]?.estado === 'completada' &&
      state.progress[activity.id]?.nodoActualId === activity.nodos.at(-1)?.id,
  )
  const visited = useRef(new Set(nodeId ? [nodeId] : []))
  const heading = useRef<HTMLHeadingElement>(null)
  const resourceTrigger = useRef<HTMLButtonElement | null>(null)
  const node = activity.nodos.find((entry) => entry.id === nodeId)
  const index = node ? activity.nodos.indexOf(node) : activity.nodos.length
  const steps = activity.nodos.filter((entry) => ['diapositiva', 'pregunta', 'eleccion'].includes(entry.tipo))
  const step = Math.max(
    1,
    node
      ? activity.nodos
          .slice(0, index + 1)
          .filter((entry) => ['diapositiva', 'pregunta', 'eleccion'].includes(entry.tipo)).length
      : steps.length,
  )
  const selected =
    node?.tipo === 'eleccion' ? node.opciones.find((option) => option.id === optionId) : undefined
  const summary = node?.tipo === 'diapositiva' && node.etiqueta?.toLowerCase() === 'resumen'
  const route = parentRoute(activities, [], completedIds, available)
  const summaryResources =
    node?.tipo === 'diapositiva'
      ? catalog.recursos.filter((resource) => node.recursoIds?.includes(resource.id))
      : []
  useEffect(() => {
    montado.current = true
    return () => {
      montado.current = false
    }
  }, [activity.id, accountId])
  useEffect(() => {
    const progress = state.progress[activity.id]
    if (
      !review &&
      serverCompletion &&
      progress?.estado === 'completada' &&
      progress.nodoActualId === activity.nodos.at(-1)?.id
    ) {
      updateParentJourney(
        (current) => ({
          ...current,
          progress: {
            ...current.progress,
            [activity.id]: { ...current.progress[activity.id], nodoActualId: '$fin' },
          },
        }),
        accountId,
      )
      return
    }
    if (
      !review &&
      accountId &&
      (!progress || (serverCompletion && !progress.nodoActualId && progress.estado === 'no_iniciada'))
    )
      updateParentJourney(
        (current) =>
          startParentActivity(activity, current, accountId, { disponible, servidor: serverCompletion }),
        accountId,
      )
  }, [activity, review, state.progress, accountId, serverCompletion, disponible])
  useEffect(() => {
    heading.current?.focus()
    heading.current?.scrollIntoView({ block: 'nearest' })
  }, [nodeId])
  function showNext() {
    const nextId = activity.nodos[index + 1]?.id
    const firstVisit = !!nextId && !visited.current.has(nextId)
    if (nextId) visited.current.add(nextId)
    setEntrance({ transition: firstVisit, resource: firstVisit })
    setNodeId(nextId)
    setOptionId(undefined)
  }
  function advance() {
    if (!node || enviando.current) return
    if (review) {
      showNext()
      return
    }
    let changed = false
    const ultimo = index === activity.nodos.length - 1
    const saved = updateParentJourney((current) => {
      const started = startParentActivity(activity, current, accountId, opciones)
      const next = advanceParentActivity(activity, node.id, started, accountId, optionId, opciones)
      changed = next !== started
      if (serverCompletion && ultimo) {
        changed = changed && readyToCompleteOnServer(activity, next)
        if (!changed) return current
        return {
          ...next,
          progress: {
            ...next.progress,
            [activity.id]: {
              ...next.progress[activity.id],
              nodoActualId: node.id,
            },
          },
        }
      }
      return next
    }, accountId)
    if (saved && changed) {
      if (serverCompletion && ultimo) {
        enviando.current = true
        setServerError('')
        return completarActividadApoderado(activity.id)
          .then((respuesta) => {
            if (!montado.current || obtenerEstadoApoderado().cuenta !== accountId) return
            if (respuesta.tipo !== 'ok') {
              setServerError(mensajeErrorServidor(respuesta))
              return
            }
            const errorConsulta = obtenerEstadoApoderado().actividades.error
            if (errorConsulta) {
              setServerError(mensajeErrorServidor(errorConsulta))
              return
            }
            const guardado = updateParentJourney(
              (current) => ({
                ...current,
                progress: {
                  ...current.progress,
                  [activity.id]: {
                    ...current.progress[activity.id],
                    nodoActualId: '$fin',
                  },
                },
              }),
              accountId,
            )
            if (!guardado) return
            setCelebrate(true)
            showNext()
          })
          .finally(() => {
            enviando.current = false
          })
      }
      if (ultimo) setCelebrate(true)
      showNext()
    }
  }
  function back() {
    if (index <= 0 || !node || enviando.current) return
    const showPrevious = () => {
      setEntrance({ transition: false, resource: false })
      setNodeId(activity.nodos[index - 1].id)
      setOptionId(undefined)
    }
    if (review) {
      showPrevious()
      return
    }
    let moved = false
    const saved = updateParentJourney((current) => {
      const next = retreatParentActivity(activity, node.id, current, opciones)
      moved = next !== current
      return next
    }, accountId)
    if (saved && moved) showPrevious()
  }
  return {
    activity,
    review,
    navigate,
    error: serverError || storageError,
    retrySaving: () =>
      serverError
        ? advance()
        : updateParentJourney(
            (current) => startParentActivity(activity, current, accountId, opciones),
            accountId,
          ),
    optionId,
    setOptionId,
    resources,
    setResources,
    practice,
    setPractice,
    entrance,
    celebrate,
    heading,
    resourceTrigger,
    node,
    index,
    steps,
    step,
    selected,
    summary,
    completedIds,
    route,
    summaryResources,
    advance,
    back,
  }
}
