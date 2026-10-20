import { useSyncExternalStore } from 'react'

import { modoApi } from '@/config/env'
import { usuariosPrueba } from '@/data/demo/usuariosPrueba'
import * as apiSesion from '@/services/api/sesion'
import type { CuentaResumen, ErrorServidor, HijoSesion, SalonSesion } from '@/types/servidor'

// B17: una sola clave en localStorage; en un equipo propio la sesión sobrevive a cerrar la pestaña.
// Reemplaza a ov.demo-access.v1 y ov.cuenta-servidor.v1 (sessionStorage) sin migrarlas: basta volver a ingresar.
const claveSesion = 'ov.acceso.v1'

export type SesionAcceso = { token: string | null; expira_en: string | null; cuenta: CuentaResumen }
export type ResultadoIngreso = { ok: true; cuenta: CuentaResumen } | { ok: false; mensaje: string }

export const mensajeCredenciales = 'Usuario o contraseña incorrectos'
export const mensajeSesionTerminada = 'Tu sesión terminó. Vuelve a ingresar.'

function esSesion(valor: unknown): valor is SesionAcceso {
  const sesion = valor as SesionAcceso | null
  return (
    typeof sesion === 'object' &&
    sesion !== null &&
    (sesion.token === null || typeof sesion.token === 'string') &&
    typeof sesion.cuenta?.codigo === 'string' &&
    ['ESTUDIANTE', 'APODERADO', 'ORIENTADORA'].includes(sesion.cuenta?.rol)
  )
}

function leerGuardada(): SesionAcceso | null {
  try {
    const guardada = typeof window === 'undefined' ? null : window.localStorage.getItem(claveSesion)
    const valor: unknown = guardada ? JSON.parse(guardada) : null
    return esSesion(valor) ? valor : null
  } catch {
    return null
  }
}

let sesion = leerGuardada()
let aviso: string | null = null
// GET /sesion: llegan al almacén pero ninguna vista los pinta todavía (docs/pendientes-interfaz.md).
let datos: { hijos: HijoSesion[]; salones: SalonSesion[] } = { hijos: [], salones: [] }
const oyentes = new Set<() => void>()

function avisar() {
  oyentes.forEach((oyente) => oyente())
}

function suscribir(oyente: () => void) {
  oyentes.add(oyente)
  return () => {
    oyentes.delete(oyente)
  }
}

export function guardarSesion(siguiente: SesionAcceso | null) {
  sesion = siguiente
  try {
    if (siguiente) window.localStorage.setItem(claveSesion, JSON.stringify(siguiente))
    else window.localStorage.removeItem(claveSesion)
  } catch {
    // Sin almacenamiento, la sesión dura lo que dure la pestaña.
  }
  avisar()
}

export const sesionActual = () => sesion
export const tokenActual = () => sesion?.token ?? null
export const avisoSesion = () => aviso
export const datosSesion = () => datos

export function iniciarSesionLocal(usuario: string, contrasena: string): ResultadoIngreso {
  const correo = usuario.trim().toLowerCase()
  const encontrado = usuariosPrueba.find((u) => u.usuario === correo && u.contrasena === contrasena)
  if (!encontrado) return { ok: false, mensaje: mensajeCredenciales }
  aviso = null
  guardarSesion({ token: null, expira_en: null, cuenta: encontrado.cuenta })
  return { ok: true, cuenta: encontrado.cuenta }
}

/** Modo api: el servidor valida las credenciales y entrega el token. Devuelve el error, si lo hubo. */
export async function iniciarSesionServidor(usuario: string, contrasena: string): Promise<ErrorServidor | null> {
  const respuesta = await apiSesion.ingresarSesion({ usuario, contrasena })
  if (respuesta.tipo !== 'ok') return respuesta
  aviso = null
  datos = { hijos: [], salones: [] }
  const { token, expira_en, cuenta } = respuesta.datos
  guardarSesion({ token, expira_en, cuenta })
  return null
}

/** Al cargar (y tras ingresar), valida el token guardado con GET /sesion; un 401 llega a `terminarSesion`. */
export async function validarSesionGuardada() {
  if (!modoApi || !sesion) return
  if (!sesion.token) {
    guardarSesion(null)
    return
  }
  const token = sesion.token
  const respuesta = await apiSesion.consultarSesion()
  if (respuesta.tipo !== 'ok' || sesion?.token !== token) return
  datos = { hijos: respuesta.datos.hijos, salones: respuesta.datos.salones }
  guardarSesion({ token, expira_en: respuesta.datos.expira_en, cuenta: respuesta.datos.cuenta })
}

/** main.tsx: el cliente HTTP lee el token de aquí y avisa los 401. */
export function conectarAccesoApi() {
  apiSesion.configurarSesionApi({ obtenerToken: tokenActual, alVencer: terminarSesion })
}

export function cerrarSesion() {
  aviso = null
  datos = { hijos: [], salones: [] }
  guardarSesion(null)
}

/** El servidor rechazó el token (401): se limpia la sesión y el login lo explica. */
export function terminarSesion() {
  if (!sesion) return
  aviso = mensajeSesionTerminada
  datos = { hijos: [], salones: [] }
  guardarSesion(null)
}

export function useSesionAcceso() {
  return useSyncExternalStore(suscribir, () => sesion, () => null)
}

export function useAvisoSesion() {
  return useSyncExternalStore(suscribir, () => aviso, () => null)
}
