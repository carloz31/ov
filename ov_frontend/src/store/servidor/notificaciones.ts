import { useSyncExternalStore } from 'react'
import * as apiNotificaciones from '@/services/api/notificaciones'
import { modoApi } from '@/config/env'
import { cuentaSesion } from './cuenta'
import { elegirHijo } from './apoderadoConversaciones'
import type { ErrorServidor, NotificacionPublica, RespuestaServidor } from '@/types/servidor'

// Ajuste notificaciones: la campana de la cuenta de la sesión (estudiante o apoderado), con su propio almacén.
// Es la única verdad de «visto». `colaToast` son solo las que llegan de acciones sin pantalla de cierre.
export type EstadoNotificaciones = {
  cuenta: string | null
  lista: NotificacionPublica[]
  total: number
  noVistas: number
  colaToast: NotificacionPublica[]
  estado: 'sin_cargar' | 'cargando' | 'listo' | 'error'
  error: ErrorServidor | null
  cargandoMas: boolean
}
const inicial = (): EstadoNotificaciones => ({
  cuenta: null,
  lista: [],
  total: 0,
  noVistas: 0,
  colaToast: [],
  estado: 'sin_cargar',
  error: null,
  cargandoMas: false,
})
let estado = inicial()
let revision = 0
let enCurso: Promise<RespuestaServidor<unknown>> | null = null
// Códigos cuyo marcado falló: se reintentan con el siguiente marcado.
let porMarcar: string[] = []
const oyentes = new Set<() => void>()
function publicar(cambios: Partial<EstadoNotificaciones>) {
  estado = { ...estado, ...cambios }
  oyentes.forEach((oyente) => oyente())
}
export const obtenerNotificaciones = () => estado
export const useNotificaciones = () =>
  useSyncExternalStore(
    (oyente) => {
      oyentes.add(oyente)
      return () => {
        oyentes.delete(oyente)
      }
    },
    () => estado,
  )
export function limpiarNotificaciones() {
  revision++
  enCurso = null
  porMarcar = []
  estado = inicial()
  oyentes.forEach((oyente) => oyente())
}
// La respuesta llegó para otra cuenta o tras limpiar el almacén: se descarta.
function vigente(cuenta: string, turno: number) {
  return turno === revision && cuenta === cuentaSesion()
}
function propia() {
  const cuenta = cuentaSesion()
  if (!modoApi || !cuenta) return null
  if (estado.cuenta !== cuenta) {
    limpiarNotificaciones()
    publicar({ cuenta })
  }
  return cuenta
}
const sinCuenta: ErrorServidor = { tipo: 'http', estado: 400, detalle: 'No hay una cuenta de servidor activa.' }

// Al ingresar y al volver a la vista principal (mapa del estudiante, Inicio del apoderado). Sin polling.
export function cargarNotificaciones(): Promise<RespuestaServidor<unknown>> {
  const cuenta = propia()
  if (!cuenta) return Promise.resolve(sinCuenta)
  if (enCurso) return enCurso
  const turno = revision
  publicar({ estado: estado.estado === 'listo' ? 'listo' : 'cargando', error: null })
  const pedido = apiNotificaciones.obtenerNotificaciones(cuenta).then((respuesta) => {
    if (!vigente(cuenta, turno)) return respuesta
    if (respuesta.tipo !== 'ok') publicar({ estado: estado.estado === 'listo' ? 'listo' : 'error', error: respuesta })
    else
      publicar({
        estado: 'listo',
        error: null,
        lista: respuesta.datos.items.map((n) => (porMarcar.includes(n.codigo) ? { ...n, vista: true } : n)),
        total: respuesta.datos.total,
        noVistas: Math.max(0, respuesta.datos.no_vistas - porMarcar.length),
      })
    return respuesta
  })
  enCurso = pedido
  void pedido.then(() => {
    if (enCurso === pedido) enCurso = null
  })
  return pedido
}
export const hayMasNotificaciones = () => estado.lista.length < estado.total

// «Mostrar más» del modal.
export async function cargarMasNotificaciones() {
  const cuenta = propia()
  if (!cuenta || estado.cargandoMas) return
  const turno = revision
  publicar({ cargandoMas: true })
  const respuesta = await apiNotificaciones.obtenerNotificaciones(cuenta, estado.lista.length)
  if (!vigente(cuenta, turno)) return
  if (respuesta.tipo !== 'ok') return publicar({ cargandoMas: false, error: respuesta })
  const conocidas = new Set(estado.lista.map((n) => n.codigo))
  publicar({
    cargandoMas: false,
    error: null,
    lista: [...estado.lista, ...respuesta.datos.items.filter((n) => !conocidas.has(n.codigo))],
    total: respuesta.datos.total,
  })
}

// Las `nuevas_notificaciones` de una acción. Con cierre, el cierre ya las anuncia: se marcan vistas y no hay
// toast; sin cierre, van a la cola de toasts. Una notificación ya conocida (un reintento) no se repite.
export function incorporarNotificaciones(nuevas: NotificacionPublica[] | undefined, conCierre: boolean) {
  if (!nuevas?.length || !propia()) return
  const conocidas = new Set(estado.lista.map((n) => n.codigo))
  const agregadas = nuevas.filter((n) => !conocidas.has(n.codigo))
  if (!agregadas.length) return
  publicar({
    lista: [...agregadas, ...estado.lista],
    total: estado.total + agregadas.length,
    noVistas: estado.noVistas + agregadas.filter((n) => !n.vista).length,
    colaToast: conCierre ? estado.colaToast : [...estado.colaToast, ...agregadas.filter((n) => !n.vista)],
  })
  if (conCierre) void marcarNotificacionesVistas(agregadas.map((n) => n.codigo))
}

// Optimista: la vista no espera al servidor. Si falla, los códigos se reintentan en el siguiente marcado.
export async function marcarNotificacionesVistas(codigos: string[]) {
  const cuenta = propia()
  if (!cuenta || !codigos.length) return
  const nuevas = estado.lista.filter((n) => codigos.includes(n.codigo) && !n.vista).length
  publicar({
    lista: estado.lista.map((n) => (codigos.includes(n.codigo) ? { ...n, vista: true } : n)),
    noVistas: Math.max(0, estado.noVistas - nuevas),
    colaToast: estado.colaToast.filter((n) => !codigos.includes(n.codigo)),
  })
  const enviados = [...new Set([...porMarcar, ...codigos])]
  porMarcar = enviados
  const turno = revision
  const respuesta = await apiNotificaciones.marcarNotificacionesVistas(cuenta, enviados)
  if (vigente(cuenta, turno) && respuesta.tipo === 'ok') porMarcar = porMarcar.filter((c) => !enviados.includes(c))
}

// «Marcar todas como vistas» del modal.
export async function marcarTodasLasNotificaciones() {
  const cuenta = propia()
  if (!cuenta) return
  publicar({ lista: estado.lista.map((n) => ({ ...n, vista: true })), noVistas: 0, colaToast: [] })
  const turno = revision
  const respuesta = await apiNotificaciones.marcarNotificacionesVistas(cuenta, [])
  if (!vigente(cuenta, turno)) return
  if (respuesta.tipo === 'ok') porMarcar = []
  else publicar({ error: respuesta })
}

// Pulsar una notificación de la campana: se marca vista y, para el apoderado, se elige el hijo de la conversación.
export function abrirNotificacion(codigo: string, hijo?: string) {
  if (hijo) elegirHijo(hijo)
  void marcarNotificacionesVistas([codigo])
}
