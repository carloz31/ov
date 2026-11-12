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
import type { Actividad, IntentoPregunta, NodoDialogo } from '@/types/activities'
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
    // Ajuste front de registros (lote 1): completado (rehacer), desde el inicio, con sus diálogos y diapositivas;
    // a medias, en el primer ítem sin respuesta (`item_actual`); con todo respondido y sin terminar, en el último
    // ítem, en lectura, donde «Continuar» lo termina. La primera vez, `item_actual` es el primero: desde el inicio.
    if (modoApi && registroServidor) {
      const { registro } = registroServidor
      const consignas = nodes.filter((n) => n.tipo === 'consigna')
      if (registro.estado === 'COMPLETADA' || !registro.items.some((i) => i.respuesta)) return nodes[0]?.id
      if (registro.item_actual === null) return consignas.at(-1)?.id ?? nodes[0]?.id
      return consignas.find((n) => n.tipo === 'consigna' && n.item === registro.item_actual)?.id ?? nodes[0]?.id
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
    avisoVelocidad,
    cerrarAvisoVelocidad,
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
    // Ajuste coherencia-bloque1: un registro del servidor con pasos de cierre se entrega al continuar el último (o
    // con «Reintentar»), con el cargador y el aviso del reproductor; `completar-actividad` rechaza los registros.
    if (modoApi && registroServidor && !args[0]) return void entregarRegistro()
    return completion.move(...args)
  }
  async function entregarRegistro() {
    if (enviando.current) return
    enviando.current = true
    setGuardando(true)
    setErrorServidor('')
    try {
      const fallo = await registro.entregar()
      if (fallo && montado.current) setErrorServidor(fallo)
    } finally {
      enviando.current = false
      if (montado.current) setGuardando(false)
    }
  }
  // «Anterior» (F01): las elecciones solo agregan reacciones, así que el camino recorrido es el orden de
  // los nodos y el paso anterior es nodes[index - 1], también al retomar. Desde el ajuste coherencia-bloque0
  // todo paso con uno previo lo tiene: también una pregunta (antes y después de responderla) y el paso que la
  // sigue, el primer ítem de un cuestionario y los pasos posteriores a la última consigna de un registro. No se
  // retrocede en un registro local entregado o un cuestionario local completado (en api, el completado se
  // relee con «Anterior», ajuste de F03).
  const [alRetroceder, setAlRetroceder] = useState<string>()
  // Al rehacer, los intentos de una pregunta no se guardan: se recuerdan aquí para que, al volver a ella, se
  // vea resuelta sin pedirla de nuevo.
  const intentosRevision = useRef<Record<string, IntentoPregunta[]>>({})
  const previo = nodes[index - 1]
  const anterior =
    previo &&
    (node || reaction) &&
    !matrix &&
    // Un registro del servidor ya completado se rehace: sus ítems sí retroceden (se ven en lectura).
    !(activity.tipo === 'registro' && (yaCompletada || edit) && !(modoApi && registroServidor)) &&
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
    avisoVelocidad,
    cerrarAvisoVelocidad,
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
    // La pantalla de Lumi y la edición de un ítem no tienen «Anterior» (ajuste front de registros, lote 1).
    onAnterior: anterior && registro.vista(node) !== 'lumi' ? retroceder : undefined,
    alRetroceder,
    intentosRevision,
  }
}
