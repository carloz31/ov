import { useFichasServidor } from '@/store/servidor/secciones'
import { useActivityCompletion } from './useActivityCompletion'
import { useEffect, useMemo, useRef, useState } from 'react'
import { modoApi } from '@/config/env'
import { actividadServidor } from '@/lib/servidor/adaptadores'
import { obtenerEstadoServidor } from '@/store/servidor/sesion'
import type { RespuestaCompletarActividad } from '@/types/servidor'
import type { InstrumentoServidor } from '@/features/activities/components/MaraInteractionPlayer'
import { catalog } from '@/data/activities/content'
import { nextPendingNode, studentId, visibleNodes } from '@/lib/activities/logic'
import type { Actividad, NodoDialogo } from '@/types/activities'
import { updateJourney, useJourney, useJourneyError } from '@/store/journeyStore'
import { prepareActivity } from '@/features/activities/lib/reflection/personalization'
import { useInstrumentResponses } from './useInstrumentResponses'
export function useActivityPlayer({
  activity,
  direct = false,
  edit = false,
  instrumentoServidor,
  onClose,
}: {
  activity: Actividad
  direct?: boolean
  edit?: boolean
  instrumentoServidor?: InstrumentoServidor
  onClose: () => void
}) {
  const state = useJourney()
  const [yaCompletada] = useState(() =>
    modoApi
      ? actividadServidor(obtenerEstadoServidor().actividades.datos, activity.id)?.estado === 'COMPLETADA'
      : state.progress[activity.id]?.estado === 'completada',
  )
  useEffect(() => {
    void prepareActivity(activity)
  }, [activity])
  const storageError = useJourneyError()
  const nodes = useMemo(() => visibleNodes(activity, direct), [activity, direct])
  const pageRef = useRef<HTMLDivElement>(null)
  const [nodeId, setNodeId] = useState(() => {
    if (modoApi && instrumentoServidor) return instrumentoServidor.nodoInicialId
    if (edit) return nodes[0]?.id
    if (
      modoApi &&
      actividadServidor(obtenerEstadoServidor().actividades.datos, activity.id)?.estado === 'COMPLETADA'
    )
      return undefined
    return nextPendingNode(activity, state, direct)?.id ?? (modoApi ? nodes.at(-1)?.id : undefined)
  })
  const enviando = useRef(false)
  const montado = useRef(true)
  const confirmacion = useRef<RespuestaCompletarActividad | undefined>(undefined)
  const [guardando, setGuardando] = useState(false)
  const [errorServidor, setErrorServidor] = useState('')
  const [cierreServidor, setCierreServidor] = useState<RespuestaCompletarActividad>()
  const node = nodes.find((node) => node.id === nodeId)
  const index = node ? nodes.indexOf(node) : nodes.length
  const {
    respuestasConfirmadas,
    soloLectura,
    revisionInstrumento,
    respuestaPendiente,
    itemResponse,
    item,
    itemServidor,
    valorServidor,
    existingItemAnswer,
    itemOptions,
  } = useInstrumentResponses({
    activity,
    instrumentoServidor,
    direct,
    node,
    nodes,
    index,
    state,
    enviando,
    montado,
    setGuardando,
    setErrorServidor,
    move,
  })
  useEffect(() => {
    montado.current = true
    return () => {
      montado.current = false
    }
  }, [])
  const [reactions, setReactions] = useState<NodoDialogo[]>([])
  const [resourceOpen, setResourceOpen] = useState(false)
  useFichasServidor(resourceOpen)
  const [resourceIds, setResourceIds] = useState<string[]>([])
  const matrix = activity.plantilla?.tipo === 'matriz' && node?.tipo === 'consigna'
  const reaction = reactions[0]
  useEffect(() => {
    updateJourney((current) =>
      current.progress[activity.id]
        ? current
        : {
            ...current,
            progress: {
              ...current.progress,
              [activity.id]: {
                estudianteId: studentId,
                actividadId: activity.id,
                estado: modoApi ? 'no_iniciada' : 'en_curso',
                iniciadaEn: new Date().toISOString(),
                nodoActualId: nodes[0]?.id,
              },
            },
          },
    )
  }, [activity.id, nodes])
  useEffect(() => {
    pageRef.current?.scrollIntoView({ block: 'start' })
    setResourceOpen(false)
  }, [nodeId])
  useEffect(() => {
    if (modoApi || node?.tipo !== 'diapositiva') return
    const sheets = (node.recursoIds ?? []).filter((id) =>
      catalog.recursos.some(
        (resource) => resource.id === id && resource.tipo === 'ficha' && resource.guardableEnRecursos,
      ),
    )
    if (sheets.some((id) => !state.resources.includes(id)))
      updateJourney((current) => ({ ...current, resources: [...new Set([...current.resources, ...sheets])] }))
  }, [node, state.resources])

  const completion = useActivityCompletion({
    activity,
    onClose,
    instrumentoServidor,
    revisionInstrumento,
    nodeId,
    enviando,
    montado,
    respuestasConfirmadas,
    confirmacion,
    setGuardando,
    setErrorServidor,
    setCierreServidor,
    setNodeId,
    setReactions,
  })
  function move(...args: Parameters<typeof completion.move>) {
    return completion.move(...args)
  }
  function advance() {
    move(nodes[index + 1], (current) =>
      node?.tipo === 'diapositiva'
        ? {
            ...current,
            readResourceIds: [
              ...new Set([
                ...(current.readResourceIds ?? current.resources),
                ...(node.recursoIds ?? []).filter((id) =>
                  catalog.recursos.some((r) => r.id === id && r.tipo === 'ficha'),
                ),
              ]),
            ],
            resources: modoApi
              ? current.resources
              : [
                  ...new Set([
                    ...current.resources,
                    ...(node.recursoIds ?? []).filter((id) =>
                      catalog.recursos.some(
                        (resource) =>
                          resource.id === id && resource.tipo === 'ficha' && resource.guardableEnRecursos,
                      ),
                    ),
                  ]),
                ],
          }
        : current,
    )
  }
  const progress = node ? ((index + 1) / nodes.length) * 100 : 100
  function openResources(ids: string[]) {
    setResourceIds(ids)
    setResourceOpen(true)
  }
  const previous = nodes[index - 1]
  const mode: 'sunrise' | 'night' =
    !reaction && (!node || matrix || node.tipo === 'consigna') ? 'sunrise' : 'night'
  return {
    pageRef,
    mode,
    nodes,
    index,
    progress,
    node,
    reaction,
    reactions,
    setReactions,
    matrix,
    previous,
    enviando,
    storageError,
    guardando,
    errorServidor,
    respuestaPendiente,
    itemResponse,
    soloLectura,
    advance,
    move,
    confirmacion,
    cierreServidor,
    yaCompletada,
    openResources,
    itemServidor,
    item,
    itemOptions,
    valorServidor,
    existingItemAnswer,
    setErrorServidor,
    revisionInstrumento,
    resourceOpen,
    resourceIds,
    setResourceOpen,
    itemOcupado: modoApi && guardando,
    itemSoloLectura: modoApi && soloLectura,
    puedeTerminarEncuentro: modoApi && !!instrumentoServidor,
  }
}
