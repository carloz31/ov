import { abrirRecurso } from '@/store/visorRecursoStore'
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
import { useRegistroServidor, type RegistroServidor } from './useRegistroServidor'
export function useActivityPlayer({
  activity,
  direct = false,
  edit = false,
  instrumentoServidor,
  registroServidor,
  onClose,
  desdeInicio = false,
}: {
  activity: Actividad
  direct?: boolean
  edit?: boolean
  // Ajuste del diario (F05): un recuerdo de Lumi se vuelve a ver desde su primer nodo, aunque esté completado.
  desdeInicio?: boolean
  instrumentoServidor?: InstrumentoServidor
  registroServidor?: RegistroServidor
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
    // Registro: la pregunta pendiente se muestra sobre la última consigna; cerrado, se consulta desde la
    // primera consigna (F02); si no, retoma en la posición guardada.
    if (modoApi && registroServidor) {
      const { registro } = registroServidor
      if (registro.respuestas.some((r) => r.estado === 'PENDIENTE_SEGUIMIENTO'))
        return nodes.findLast((n) => n.tipo === 'consigna')?.id
      if (registro.estado === 'COMPLETADA') return nodes[0]?.id
      return nodes.find((n) => n.id === registro.posicion)?.id ?? nodes[0]?.id
    }
    if (edit || desdeInicio) return nodes[0]?.id
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
    lectura,
    cambiarRespuestas,
    respuestasFijas,
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
    // El foco de cada paso va al botón principal (Enter avanza), nunca a «Anterior»; en una pregunta, a la
    // opción elegida o a la primera.
    const stage = pageRef.current?.querySelector('.sx-player-stage')
    const foco =
      stage?.querySelector<HTMLElement>('.sx-player-option[aria-pressed="true"]') ??
      (node?.tipo === 'item' ? stage?.querySelector<HTMLElement>('.sx-player-option') : null) ??
      stage?.querySelector<HTMLElement>('.sx-primary-button')
    foco?.focus({ preventScroll: true })
  }, [nodeId, reactions, node?.tipo])
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
  // «Anterior» (F01): las elecciones solo agregan reacciones, así que el camino recorrido es el orden de
  // los nodos y el paso anterior es nodes[index - 1], también al retomar. No se retrocede hacia ni desde
  // una pregunta con retroalimentación, ni en un registro entregado (salvo en su consulta, F02) o un
  // cuestionario local completado (en api, el completado se relee con «Anterior», ajuste de F03).
  const [alRetroceder, setAlRetroceder] = useState<string>()
  const previo = nodes[index - 1]
  const anterior =
    previo &&
    (node || reaction) &&
    !matrix &&
    node?.tipo !== 'pregunta' &&
    // La primera pregunta de un cuestionario no vuelve al diálogo de entrada.
    !(node?.tipo === 'item' && index === nodes.findIndex((n) => n.tipo === 'item')) &&
    previo.tipo !== 'pregunta' &&
    // Un registro del servidor ya completado se consulta (F02): sus consignas sí retroceden.
    !(activity.tipo === 'registro' && (yaCompletada || edit) && !(modoApi && registroServidor)) &&
    // Tras la última consigna el registro ya está entregado: sus pasos posteriores no retroceden.
    !(activity.tipo === 'registro' && index > nodes.findLastIndex((n) => n.tipo === 'consigna')) &&
    !(activity.tipo === 'instrumento' && yaCompletada && !instrumentoServidor)
      ? previo
      : undefined
  function retroceder() {
    if (!anterior || enviando.current) return
    updateJourney((current) => ({
      ...current,
      progress: {
        ...current.progress,
        [activity.id]: { ...current.progress[activity.id], nodoActualId: anterior.id },
      },
    }))
    setReactions([])
    setAlRetroceder(anterior.id)
    setNodeId(anterior.id)
  }
  const registro = useRegistroServidor({
    actividad: activity.id,
    registroServidor: modoApi ? registroServidor : undefined,
    nodes,
    montado,
    avanzar: (siguiente) => move(siguiente),
    anterior,
    volver: retroceder,
    terminar: (cierre) => {
      setCierreServidor(cierre)
      updateJourney((current) => ({
        ...current,
        progress: {
          ...current.progress,
          [activity.id]: { ...current.progress[activity.id], nodoActualId: '$fin' },
        },
      }))
      setNodeId(undefined)
      setReactions([])
    },
  })
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
    // F04d: se abre con el visor de la mochila, encima del reproductor. Una diapositiva trae a lo más un
    // recurso (lo valida `validateActivity`).
    if (ids[0]) abrirRecurso(ids[0], 'mochila')
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
    itemOcupado: modoApi && guardando,
    // Api: en un test, elegir marca la opción y «Continuar» la envía.
    itemConfirmar: modoApi && !!instrumentoServidor,
    itemSoloLectura: modoApi && lectura,
    itemCambiar: modoApi ? cambiarRespuestas : undefined,
    itemFijas: modoApi && respuestasFijas,
    puedeTerminarEncuentro: modoApi && !!instrumentoServidor,
    registro,
    // En un registro del servidor «Anterior» guarda el borrador antes de volver (useRegistroServidor).
    onAnterior: anterior ? retroceder : undefined,
    alRetroceder,
  }
}
