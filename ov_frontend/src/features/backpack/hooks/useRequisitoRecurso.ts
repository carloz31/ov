import { useEffect, useState } from 'react'
import { modoApi } from '@/config/env'
import { textoRequisito } from '@/lib/servidor/adaptadores'
import { consultarProgreso } from '@/store/servidor/consultas'
import { mensajeErrorServidor, useEstadoServidor } from '@/store/servidor/sesion'
import type { TestimonioEstado } from '@/types/servidor'

// Lo bloqueado de un contenido concreto se explica en un pop up: la pista del testimonio, si la tiene;
// si no, el mensaje de bloqueo del servidor, como en las fichas. Lo usan la mochila y el visor (F04d).
export function useRequisitoRecurso(id: string | null, testimonio?: TestimonioEstado) {
  const servidor = useEstadoServidor()
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
          ? textoRequisito(respuesta.datos, servidor.actividades.datos)
          : mensajeErrorServidor(respuesta),
      )
      setPendiente(false)
      setError(respuesta.tipo !== 'ok')
    })
    return () => {
      vigente = false
    }
  }, [id, servidor.actividades.datos, intento, testimonio])
  return {
    titulo: testimonio ? 'Cómo conocer este testimonio' : 'Cómo obtener esta ficha',
    texto,
    pendiente,
    error,
    reintentar: () => setIntento((i) => i + 1),
  }
}
