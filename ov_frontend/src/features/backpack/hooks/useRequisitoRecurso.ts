import { useEffect, useState } from 'react'
import { modoApi } from '@/config/env'
import { textoRequisito } from '@/lib/servidor/adaptadores'
import { consultarProgreso } from '@/store/servidor/consultas'
import { useRevisionAcciones } from '@/store/servidor/refresco'
import { mensajeErrorServidor, obtenerEstadoServidor } from '@/store/servidor/sesion'
import type { TestimonioEstado } from '@/types/servidor'

// Lo bloqueado de un contenido concreto se explica en un pop up: la pista del testimonio, si la tiene;
// si no, el mensaje de bloqueo del servidor, como en las fichas. Lo usan la mochila y el visor (F04d).
export function useRequisitoRecurso(id: string | null, testimonio?: TestimonioEstado) {
  // Auditoría plataforma (F2b): el requisito se vuelve a pedir con cada acción confirmada (sus conteos cambian con
  // los eventos), no con cada recarga de actividades.
  const revisionAcciones = useRevisionAcciones()
  const [texto, setTexto] = useState('')
  const [pendiente, setPendiente] = useState(false)
  const [error, setError] = useState(false)
  const [intento, setIntento] = useState(0)
  useEffect(() => {
    if (!modoApi || !id) return
    if (testimonio?.pista) {
      setPendiente(false)
      setError(false)
      setTexto(testimonio.pista)
      return
    }
    let vigente = true
    setPendiente(true)
    setError(false)
    setTexto('Consultando el requisito en el servidor…')
    void consultarProgreso(testimonio ? 'TESTIMONIO' : 'FICHA', id).then((respuesta) => {
      if (!vigente) return
      setTexto(
        respuesta.tipo === 'ok'
          ? textoRequisito(respuesta.datos, obtenerEstadoServidor().actividades.datos)
          : mensajeErrorServidor(respuesta),
      )
      setPendiente(false)
      setError(respuesta.tipo !== 'ok')
    })
    return () => {
      vigente = false
    }
  }, [id, revisionAcciones, intento, testimonio])
  return {
    titulo: testimonio ? 'Cómo conocer este testimonio' : 'Cómo obtener esta ficha',
    texto,
    pendiente,
    error,
    reintentar: () => setIntento((i) => i + 1),
  }
}
