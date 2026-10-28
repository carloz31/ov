import { useEffect, useSyncExternalStore } from 'react'
import { modoApi } from '@/config/env'
import * as apiConversaciones from '@/services/api/conversaciones'
import { datosSesion } from '../accesoStore'
import { obtenerEstadoApoderado } from './apoderado'
import type { Seccion } from './sesion'
import type {
  ConversacionesCuenta,
  ErrorServidor,
  HijoSesion,
  RespuestaAccion,
  RespuestaAgrupada,
  RespuestaServidor,
} from '@/types/servidor'

// F08: Conversaciones del apoderado, por vínculo. El hijo activo (por defecto, el primero de la sesión) se
// conserva al navegar entre carta, lista, conversación y regalo; cada hijo tiene su propia sección.
type AlmacenConversacionesApoderado = {
  // La cuenta del apoderado a la que pertenece lo cargado; si la sesión cambia, se descarta.
  cuenta: string | null
  hijo: string | null
  porHijo: Record<string, Seccion<ConversacionesCuenta>>
  // 'carta' o el código de la conversación que se está guardando.
  enviando: string | null
}
const inicial = (): AlmacenConversacionesApoderado => ({
  cuenta: null,
  hijo: null,
  porHijo: {},
  enviando: null,
})
let estado = inicial()
let revision = 0
const pendientes = new Map<
  string,
  { revision: number; promesa: Promise<RespuestaServidor<ConversacionesCuenta>> }
>()
const oyentes = new Set<() => void>()
function publicar(cambios: Partial<AlmacenConversacionesApoderado>) {
  estado = { ...estado, ...cambios }
  oyentes.forEach((oyente) => oyente())
}
function publicarHijo(hijo: string, seccion: Seccion<ConversacionesCuenta>) {
  publicar({ porHijo: { ...estado.porHijo, [hijo]: seccion } })
}
const vacia = (): Seccion<ConversacionesCuenta> => ({ datos: null, estado: 'sin_cargar', error: null })
const sinCuenta = (): ErrorServidor => ({
  tipo: 'http',
  estado: 400,
  detalle: 'No hay una cuenta de apoderado activa.',
})
const cambioSesion = (): ErrorServidor => ({
  tipo: 'http',
  estado: 409,
  detalle: 'La sesión del apoderado cambió durante la petición.',
})

export const hijosApoderado = (): HijoSesion[] => datosSesion().hijos
export const obtenerConversacionesApoderado = () => estado
export const useConversacionesApoderado = () =>
  useSyncExternalStore(
    (oyente) => {
      oyentes.add(oyente)
      return () => oyentes.delete(oyente)
    },
    () => estado,
  )

export function limpiarConversacionesApoderado() {
  revision++
  pendientes.clear()
  estado = inicial()
  oyentes.forEach((oyente) => oyente())
}

// El hijo activo: el elegido, si sigue en la sesión; si no, el primero.
export function hijoActivo(): string | null {
  const hijos = hijosApoderado()
  return hijos.some((h) => h.codigo === estado.hijo) ? estado.hijo : (hijos[0]?.codigo ?? null)
}

export function elegirHijo(codigo: string) {
  if (!hijosApoderado().some((h) => h.codigo === codigo)) return
  publicar({ hijo: codigo })
  void asegurarConversacionesApoderado()
}

export function asegurarConversacionesApoderado(): Promise<RespuestaServidor<ConversacionesCuenta>> {
  const cuenta = obtenerEstadoApoderado().cuenta
  if (cuenta && cuenta !== estado.cuenta) {
    limpiarConversacionesApoderado()
    publicar({ cuenta })
  }
  const hijo = hijoActivo(),
    actual = revision
  if (!modoApi || !cuenta || !hijo) return Promise.resolve(sinCuenta())
  const pendiente = pendientes.get(hijo)
  if (pendiente?.revision === actual) return pendiente.promesa
  const seccion = estado.porHijo[hijo] ?? vacia()
  if (seccion.estado === 'listo') return Promise.resolve({ tipo: 'ok', datos: seccion.datos! })
  if (seccion.estado === 'error') return Promise.resolve(seccion.error!)
  const tarea = {
    revision: actual,
    promesa: Promise.resolve()
      .then(async (): Promise<RespuestaServidor<ConversacionesCuenta>> => {
        const respuesta = await apiConversaciones.obtenerConversaciones(cuenta, hijo)
        if (actual !== revision || cuenta !== obtenerEstadoApoderado().cuenta) return cambioSesion()
        const previa = estado.porHijo[hijo] ?? vacia()
        publicarHijo(
          hijo,
          respuesta.tipo === 'ok'
            ? { datos: respuesta.datos, estado: 'listo', error: null }
            : { ...previa, estado: 'error', error: respuesta },
        )
        return respuesta
      })
      .finally(() => {
        if (pendientes.get(hijo) === tarea) pendientes.delete(hijo)
      }),
  }
  pendientes.set(hijo, tarea)
  publicarHijo(hijo, { ...seccion, estado: 'cargando', error: null })
  return tarea.promesa
}

// Lo que cambia el hijo se revalida al abrir la vista: se muestra lo ya cargado y se vuelve a pedir.
export function vencerConversacionesApoderado(hijo = hijoActivo()) {
  if (!hijo) return Promise.resolve(sinCuenta())
  revision++
  pendientes.delete(hijo)
  const seccion = estado.porHijo[hijo] ?? vacia()
  publicarHijo(hijo, { ...seccion, estado: 'vencido', error: null })
  return asegurarConversacionesApoderado()
}

export const reintentarConversacionesApoderado = () => vencerConversacionesApoderado()

async function enviarAccion<T>(
  clave: string,
  accion: (cuenta: string, hijo: string) => Promise<RespuestaServidor<T>>,
): Promise<RespuestaServidor<T>> {
  const cuenta = obtenerEstadoApoderado().cuenta,
    hijo = hijoActivo()
  if (!modoApi || !cuenta || !hijo) return sinCuenta()
  if (estado.enviando) return { tipo: 'http', estado: 409, detalle: 'Hay otra acción en envío.' }
  publicar({ enviando: clave })
  try {
    const respuesta = await accion(cuenta, hijo)
    if (respuesta.tipo === 'ok') await vencerConversacionesApoderado(hijo)
    return respuesta
  } finally {
    publicar({ enviando: null })
  }
}

// Siempre con el estudiante del vínculo activo.
export const guardarCartaApoderado = (texto: string): Promise<RespuestaServidor<RespuestaAccion>> =>
  enviarAccion('carta', (cuenta, hijo) => apiConversaciones.enviarCarta(cuenta, texto, hijo))

export const responderConversacionApoderado = (
  conversacion: string,
  texto: string,
): Promise<RespuestaServidor<RespuestaAgrupada>> =>
  enviarAccion(conversacion, (cuenta, hijo) =>
    apiConversaciones.enviarRespuestaConversacion(cuenta, conversacion, texto, hijo),
  )

// Al montar Conversaciones (o al cambiar de hijo) se pide el vínculo activo; si ya estaba cargado, se revalida
// (lo cambia también el hijo) mostrando lo último leído.
export function useConversacionesApoderadoSeccion(activo = true) {
  const almacen = useConversacionesApoderado()
  const cuenta = obtenerEstadoApoderado().cuenta
  const hijo = hijoActivo()
  useEffect(() => {
    if (!modoApi || !activo || !cuenta || !hijo) return
    if (estado.porHijo[hijo]?.estado === 'listo') void vencerConversacionesApoderado(hijo)
    else void asegurarConversacionesApoderado()
  }, [activo, cuenta, hijo])
  return { hijo, seccion: hijo ? (almacen.porHijo[hijo] ?? vacia()) : vacia(), enviando: almacen.enviando }
}
