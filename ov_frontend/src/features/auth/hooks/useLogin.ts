import { useState } from 'react'
import { useNavigate } from 'react-router'

import { modoApi } from '@/config/env'
import { portalPorRol } from '@/routes/paths'
import { iniciarSesionLocal, useAvisoSesion, useSesionAcceso } from '@/store/accesoStore'

export function useLogin() {
  const navigate = useNavigate()
  const sesion = useSesionAcceso()
  const aviso = useAvisoSesion()
  const [error, setError] = useState<string | null>(null)
  const [enviando, setEnviando] = useState(false)
  async function enter(usuario: string, contrasena: string) {
    if (enviando) return
    setEnviando(true)
    setError(null)
    const resultado = iniciarSesionLocal(usuario, contrasena)
    setEnviando(false)
    if (!resultado.ok) {
      setError(resultado.mensaje)
      return
    }
    navigate(portalPorRol[resultado.cuenta.rol], { replace: true })
  }
  return {
    cuenta: sesion?.cuenta ?? null,
    enter,
    error: error ?? aviso,
    enviando,
    mostrarAvisoDemo: !modoApi,
  }
}
