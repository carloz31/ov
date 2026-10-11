import { useState } from 'react'
import { desarrollo, modoApi } from '@/config/env'
import { reiniciarDatosDePrueba } from '@/store/servidor/operaciones'
import { mensajeErrorServidor, useEstadoServidor } from '@/store/servidor/sesion'

import { useNavigate } from 'react-router'

export function useStudentAccount() {
  const servidor = useEstadoServidor()
  const nombre = modoApi ? (servidor.resumen.datos?.cuenta.nombre ?? 'Estudiante') : 'Alex'
  const navigate = useNavigate()
  const [confirmar, setConfirmar] = useState(false)
  const [ocupado, setOcupado] = useState(false)
  const [error, setError] = useState('')
  async function reiniciar() {
    if (ocupado) return
    setOcupado(true)
    setError('')
    try {
      const respuesta = await reiniciarDatosDePrueba()
      if (respuesta.tipo === 'ok') window.location.reload()
      else setError(mensajeErrorServidor(respuesta))
    } catch {
      setError('No se pudo limpiar el almacenamiento del navegador. Vuelve a intentarlo.')
    } finally {
      setOcupado(false)
    }
  }
  return {
    nombre,
    navigate,
    confirmar,
    setConfirmar,
    ocupado,
    error,
    reiniciar,
    iniciales: modoApi ? nombre.slice(0, 2).toUpperCase() : 'AL',
    puedeReiniciar: modoApi && desarrollo,
  }
}
