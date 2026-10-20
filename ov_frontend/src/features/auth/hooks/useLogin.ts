import { useState } from 'react'
import { useNavigate } from 'react-router'

import { modoApi } from '@/config/env'
import { portalPorRol } from '@/routes/paths'
import {
  iniciarSesionLocal,
  iniciarSesionServidor,
  sesionActual,
  useAvisoSesion,
  useSesionAcceso,
  validarSesionGuardada,
} from '@/store/accesoStore'
import { prepararIngreso } from '@/store/servidor/operaciones'
import { mensajeErrorServidor, prepararAlmacenesApi } from '@/store/servidor/sesion'

async function ingresar(usuario: string, contrasena: string) {
  if (!modoApi) return iniciarSesionLocal(usuario, contrasena)
  const error = await iniciarSesionServidor(usuario, contrasena)
  const cuenta = sesionActual()?.cuenta
  if (error || !cuenta) return { ok: false as const, mensaje: mensajeErrorServidor(error) }
  // Los almacenes del servidor empiezan limpios para la cuenta que acaba de ingresar.
  prepararIngreso()
  prepararAlmacenesApi()
  void validarSesionGuardada()
  return { ok: true as const, cuenta }
}

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
    const resultado = await ingresar(usuario, contrasena)
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
