import { useEffect, useSyncExternalStore } from 'react'
import * as apiCasos from '@/services/api/casos'
import * as apiAcciones from '@/services/api/acciones'
import * as apiCatalogo from '@/services/api/catalogo'
import { consultarCuenta, sesionServidor } from './sesion'
import { accionConRefresco } from './refresco'
import type { ErrorServidor, OcupacionCaso, RespuestaResolverCaso } from '@/types/servidor'

export function consultarCasos() {
  return consultarCuenta(apiCasos.obtenerCasos)
}
export function consultarColeccion() {
  return consultarCuenta(apiCasos.obtenerColeccion)
}
// `ocupaciones`: las bien asignadas; entran a la colección solo si el intento supera el caso.
export function resolverCaso(
  actividad: string,
  puntaje: number,
  ocupaciones: string[],
  confirmada?: RespuestaResolverCaso,
) {
  return accionConRefresco(
    (cuenta) => apiAcciones.resolverCaso({ cuenta, actividad, puntaje, ocupaciones }),
    confirmada,
    // Ajuste notificaciones: el informe final del caso anuncia lo desbloqueado (sin toast).
    true,
  )
}

// Ajuste carga-casos: las ocupaciones del directorio de un caso (cargo y hoja de vida), una sola petición al entrar.
// Se guardan por la lista de códigos; un error se puede reintentar. Lo cargado es de una sesión de cuenta.
export type OcupacionesCaso = {
  estado: 'cargando' | 'listo' | 'error'
  datos: OcupacionCaso[] | null
  error: ErrorServidor | null
}
const directorios = new Map<string, OcupacionesCaso>()
let sesionDirectorios = -1
const oyentes = new Set<() => void>()
const avisar = () => oyentes.forEach((oyente) => oyente())
const suscribir = (oyente: () => void) => {
  oyentes.add(oyente)
  return () => {
    oyentes.delete(oyente)
  }
}
function vigentes() {
  if (sesionDirectorios === sesionServidor()) return
  directorios.clear()
  sesionDirectorios = sesionServidor()
}
export function cargarOcupacionesCaso(codigos: string[], reintentar = false) {
  vigentes()
  const llave = codigos.join(',')
  const actual = directorios.get(llave)
  if (actual && (actual.estado !== 'error' || !reintentar)) return
  directorios.set(llave, { estado: 'cargando', datos: null, error: null })
  avisar()
  const sesion = sesionServidor()
  void consultarCuenta((cuenta) => apiCatalogo.obtenerOcupacionesCaso(cuenta, codigos)).then((respuesta) => {
    if (sesion !== sesionServidor()) return
    directorios.set(
      llave,
      respuesta.tipo === 'ok'
        ? { estado: 'listo', datos: respuesta.datos, error: null }
        : { estado: 'error', datos: null, error: respuesta },
    )
    avisar()
  })
}
export function useOcupacionesCaso(codigos: string[] | undefined) {
  const llave = codigos?.join(',')
  const directorio = useSyncExternalStore(suscribir, () =>
    llave && sesionDirectorios === sesionServidor() ? directorios.get(llave) : undefined,
  )
  useEffect(() => {
    if (llave) cargarOcupacionesCaso(llave.split(','))
  }, [llave])
  return directorio
}
