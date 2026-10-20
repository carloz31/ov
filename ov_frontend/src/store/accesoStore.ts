import { useSyncExternalStore } from 'react'

import { usuariosPrueba } from '@/data/demo/usuariosPrueba'
import type { CuentaResumen } from '@/types/servidor'

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

export function iniciarSesionLocal(usuario: string, contrasena: string): ResultadoIngreso {
  const correo = usuario.trim().toLowerCase()
  const encontrado = usuariosPrueba.find((u) => u.usuario === correo && u.contrasena === contrasena)
  if (!encontrado) return { ok: false, mensaje: mensajeCredenciales }
  aviso = null
  guardarSesion({ token: null, expira_en: null, cuenta: encontrado.cuenta })
  return { ok: true, cuenta: encontrado.cuenta }
}

export function cerrarSesion() {
  aviso = null
  guardarSesion(null)
}

/** El servidor rechazó el token (401): se limpia la sesión y el login lo explica. */
export function terminarSesion() {
  aviso = mensajeSesionTerminada
  guardarSesion(null)
}

export function useSesionAcceso() {
  return useSyncExternalStore(suscribir, () => sesion, () => null)
}

export function useAvisoSesion() {
  return useSyncExternalStore(suscribir, () => aviso, () => null)
}
