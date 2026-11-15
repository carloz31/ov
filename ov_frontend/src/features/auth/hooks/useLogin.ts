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
import { ESPERA_AVISO_INGRESO_MS, mensajeIngreso } from '../lib/mensajeIngreso'
import { mensajeErrorServidor, prepararAlmacenesApi } from '@/store/servidor/sesion'

async function ingresar(usuario: string, contrasena: string) {
  if (!modoApi) return iniciarSesionLocal(usuario, contrasena)
  const error = await iniciarSesionServidor(usuario, contrasena)
  const cuenta = sesionActual()?.cuenta
  if (error || !cuenta)
    return { ok: false as const, mensaje: error ? mensajeIngreso(error, mensajeErrorServidor) : mensajeErrorServidor(error) }
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
  // Auditoría plataforma: tras unos segundos sin respuesta, se avisa que siga esperando (sin tiempo límite propio
  // ni reintentos: el botón vuelve a activarse cuando la petición termina, bien o mal).
  const [lento, setLento] = useState(false)
  async function enter(usuario: string, contrasena: string) {
    if (enviando) return
    setEnviando(true)
    setError(null)
    // Solo en api: el ingreso local es inmediato (y el arnés del modo local no tiene temporizadores).
    const aviso = modoApi ? setTimeout(() => setLento(true), ESPERA_AVISO_INGRESO_MS) : undefined
    const resultado = await ingresar(usuario, contrasena)
    if (aviso !== undefined) {
      clearTimeout(aviso)
      setLento(false)
    }
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
    lento,
    mostrarAvisoDemo: !modoApi,
  }
}
