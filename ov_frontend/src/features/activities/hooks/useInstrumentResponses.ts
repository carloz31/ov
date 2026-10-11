import { useRef, useState } from 'react'
import { modoApi } from '@/config/env'
import { responderItems } from '@/store/servidor/operaciones'
import { textoBloqueo } from '@/lib/servidor/adaptadores'
import { mensajeErrorServidor, obtenerEstadoServidor } from '@/store/servidor/sesion'
import { cargarResultadoRiasec } from '@/store/servidor/resultado'
import { consultarRespuestas } from '@/store/servidor/consultas'
import type { RespuestaItemsGuardados } from '@/types/servidor'
import type { InstrumentoServidor } from '@/features/activities/components/MaraInteractionPlayer'
import { catalog } from '@/data/activities/content'
import { studentId } from '@/lib/activities/logic'
import type { JourneyState } from '@/types/activities'
import type { Actividad, Nodo, NodoDialogo } from '@/types/activities'

import type { RefObject, Dispatch, SetStateAction } from 'react'
export function useInstrumentResponses({
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
}: {
  activity: Actividad
  instrumentoServidor?: InstrumentoServidor
  direct: boolean
  node?: Nodo
  nodes: Nodo[]
  index: number
  state: JourneyState
  enviando: RefObject<boolean>
  montado: RefObject<boolean>
  setGuardando: Dispatch<SetStateAction<boolean>>
  setErrorServidor: Dispatch<SetStateAction<string>>
  move: (
    next: Nodo | undefined,
    transform?: (current: JourneyState) => JourneyState,
    response?: NodoDialogo[],
  ) => void
}) {
  const respuestasConfirmadas = useRef(
    Object.fromEntries((instrumentoServidor?.respuestas ?? []).map((r) => [r.item, r.opcion.orden])),
  )
  const [respuestasApi, setRespuestasApi] = useState(respuestasConfirmadas.current)
  const [soloLectura, setSoloLectura] = useState(instrumentoServidor?.soloLectura ?? false)
  const [revisionInstrumento, setRevisionInstrumento] = useState(instrumentoServidor?.revision ?? false)
  const respuestaPendiente = useRef<
    { item: string; valor: number; confirmada?: RespuestaItemsGuardados } | undefined
  >(undefined)
  function itemResponse(value: string | number) {
    if (node?.tipo !== 'item') return
    if (modoApi && instrumentoServidor) {
      if (enviando.current || soloLectura) return
      const itemId = node.itemId,
        valor = Number(value)
      if (
        !instrumentoServidor.items
          .find((i) => i.codigo === itemId)
          ?.escala.opciones.some((o) => o.orden === valor)
      )
        return
      const pendiente = respuestaPendiente.current ?? { item: itemId, valor }
      respuestaPendiente.current = pendiente
      enviando.current = true
      setGuardando(true)
      setErrorServidor('')
      void (async () => {
        try {
          const respuesta = await responderItems(
            activity.id,
            [{ item: pendiente.item, opcion: pendiente.valor }],
            pendiente.confirmada,
          )
          if (!montado.current) return
          if (respuesta.tipo === 'ok' || respuesta.tipo === 'guardado_sin_refrescar') {
            for (const r of respuesta.datos.respuestas_guardadas)
              respuestasConfirmadas.current[r.item] = r.opcion
            setRespuestasApi({ ...respuestasConfirmadas.current })
            if (respuesta.tipo === 'guardado_sin_refrescar') {
              pendiente.confirmada = respuesta.datos
              setErrorServidor(
                'La respuesta se guardó, pero no se pudo actualizar el camino. Reintenta la consulta.',
              )
            } else {
              respuestaPendiente.current = undefined
              enviando.current = false
              move(nodes[index + 1])
            }
          } else if (respuesta.tipo === 'bloqueado') {
            if (respuesta.detalle.mensaje?.includes('resultado vigente')) {
              setSoloLectura(true)
              setRevisionInstrumento(true)
              respuestaPendiente.current = undefined
              const respuestas = await consultarRespuestas(activity.id)
              if (!montado.current) return
              if (respuestas.tipo === 'ok') {
                respuestasConfirmadas.current = Object.fromEntries(
                  respuestas.datos.respuestas.map((r) => [r.item, r.opcion.orden]),
                )
                setRespuestasApi({ ...respuestasConfirmadas.current })
              }
              await cargarResultadoRiasec()
              if (!montado.current) return
            }
            setErrorServidor(textoBloqueo(respuesta.detalle, obtenerEstadoServidor().actividades.datos))
          } else
            setErrorServidor(
              respuesta.tipo === 'sin_conexion'
                ? 'No se pudo guardar en el servidor'
                : mensajeErrorServidor(respuesta),
            )
        } catch {
          if (montado.current) setErrorServidor('No se pudo guardar en el servidor')
        } finally {
          enviando.current = false
          if (montado.current) setGuardando(false)
        }
      })()
      return
    }
    move(
      nodes[index + 1],
      (current) => ({
        ...current,
        items: [
          ...current.items.filter(
            (answer) =>
              !(
                answer.instrumentoId === node.instrumentoId &&
                answer.itemId === node.itemId &&
                answer.aplicacion === 'unica'
              ),
          ),
          {
            estudianteId: studentId,
            instrumentoId: node.instrumentoId,
            itemId: node.itemId,
            aplicacion: 'unica',
            valor: value,
            actividadId: activity.id,
            respondidaEn: new Date().toISOString(),
          },
        ],
      }),
      direct ? [] : (node.reacciones?.[String(value)] ?? []),
    )
  }
  const item =
    node?.tipo === 'item'
      ? catalog.instrumentos
          .find((instrument) => instrument.id === node.instrumentoId)
          ?.items.find((item) => item.id === node.itemId)
      : undefined
  const itemServidor =
    node?.tipo === 'item' ? instrumentoServidor?.items.find((i) => i.codigo === node.itemId) : undefined
  const valorServidor = node?.tipo === 'item' ? respuestasApi[node.itemId] : undefined
  const existingItemAnswer =
    node?.tipo === 'item'
      ? state.items.find(
          (answer) =>
            answer.instrumentoId === node.instrumentoId &&
            answer.itemId === node.itemId &&
            answer.aplicacion === 'unica',
        )
      : undefined
  const itemOptions =
    item?.formato.tipo === 'si_no'
      ? Object.entries(item.formato.etiquetas).map(([value, text]) => ({ value, text }))
      : item?.formato.tipo === 'likert'
        ? Array.from({ length: item.formato.puntos }, (_, i) => ({
            value: i + 1,
            text: item.formato.tipo === 'likert' ? (item.formato.etiquetas[i] ?? String(i + 1)) : '',
          }))
        : item?.formato.tipo === 'opcion_unica'
          ? item.formato.opciones.map((option) => ({ value: option.valor, text: option.texto }))
          : []

  return {
    respuestasConfirmadas,
    respuestasApi,
    soloLectura,
    revisionInstrumento,
    respuestaPendiente,
    itemResponse,
    item,
    itemServidor,
    valorServidor,
    existingItemAnswer,
    itemOptions,
  }
}
