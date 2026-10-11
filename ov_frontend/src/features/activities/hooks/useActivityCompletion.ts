import { modoApi } from '@/config/env'
import { completarActividad } from '@/store/servidor/operaciones'
import { textoBloqueo } from '@/lib/servidor/adaptadores'
import { mensajeErrorServidor, obtenerEstadoServidor } from '@/store/servidor/sesion'
import { applyCompletion, isActivityComplete, studentId } from '@/lib/activities/logic'
import type { JourneyState } from '@/types/activities'
import type { Nodo, NodoDialogo } from '@/types/activities'
import { getJourneySnapshot, updateJourney } from '@/store/journeyStore'
import type { ActivityCompletionContext } from './activityPlayerTypes'
export function useActivityCompletion({
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
}: ActivityCompletionContext) {
  function move(
    next: Nodo | undefined,
    transform: (current: JourneyState) => JourneyState = (current) => current,
    response: NodoDialogo[] = [],
  ) {
    if (enviando.current) return
    if (modoApi && revisionInstrumento && !next) {
      onClose()
      return
    }
    const saved = updateJourney((current) => {
      const changed = transform(current)
      const nextState: JourneyState = {
        ...changed,
        progress: {
          ...changed.progress,
          [activity.id]: {
            ...changed.progress[activity.id],
            estudianteId: studentId,
            actividadId: activity.id,
            estado: changed.progress[activity.id]?.estado ?? (modoApi ? 'no_iniciada' : 'en_curso'),
            nodoActualId: next?.id ?? (modoApi ? nodeId : '$fin'),
          },
        },
      }
      return modoApi ? nextState : applyCompletion(activity, nextState)
    })
    if (saved && modoApi && !next) {
      const actual = getJourneySnapshot()
      const candidato = {
        ...actual,
        progress: {
          ...actual.progress,
          [activity.id]: { ...actual.progress[activity.id], nodoActualId: '$fin' },
        },
      }
      const completa = instrumentoServidor
        ? instrumentoServidor.items.every((item) => respuestasConfirmadas.current[item.codigo] !== undefined)
        : isActivityComplete(activity, candidato)
      if (!confirmacion.current && !completa) {
        setErrorServidor('Completa las respuestas y comprobaciones pendientes antes de cerrar la actividad.')
        return
      }
      // Único punto que informa $fin, tanto la primera vez como al repetir.
      enviando.current = true
      setGuardando(true)
      setErrorServidor('')
      void (async () => {
        try {
          const respuesta = await completarActividad(activity.id, confirmacion.current)
          if (respuesta.tipo === 'guardado_sin_refrescar') confirmacion.current = respuesta.datos
          if (!montado.current) return
          if (respuesta.tipo === 'ok') {
            setCierreServidor(respuesta.datos)
            updateJourney((current) => ({
              ...current,
              progress: {
                ...current.progress,
                [activity.id]: { ...current.progress[activity.id], nodoActualId: '$fin' },
              },
            }))
            setNodeId(undefined)
            setReactions(response)
          } else if (respuesta.tipo === 'bloqueado')
            setErrorServidor(textoBloqueo(respuesta.detalle, obtenerEstadoServidor().actividades.datos))
          else if (respuesta.tipo === 'guardado_sin_refrescar')
            setErrorServidor(
              'La actividad se guardó, pero no se pudo actualizar el camino. Reintenta la consulta.',
            )
          else
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
    if (saved) {
      setNodeId(next?.id)
      setReactions(response)
    }
  }
  return { move }
}
