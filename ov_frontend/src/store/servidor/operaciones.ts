import * as apiAcciones from '@/services/api/acciones'
import * as apiDesarrollo from '@/services/api/desarrollo'
import * as apiLogros from '@/services/api/logros'
import * as apiPresentaciones from '@/services/api/presentaciones'
import { desarrollo, modoApi } from '@/config/env'
import { cuentaActiva } from './cuenta'
import { limpiarEstadoApoderado } from './apoderado'
import {
  informarErrorServidor,
  limpiarEstadoServidor,
  prepararAlmacenesApi,
  sesionServidor,
  obtenerEstadoServidor,
  publicar,
} from './sesion'
import { revelarDesbloqueos } from './revelado'
import { cargarNotificaciones, incorporarNotificaciones, limpiarNotificaciones } from './notificaciones'
import { refrescar } from './refresco'
import type {
  ErrorServidor,
  RespuestaAccion,
  RespuestaCompletarActividad,
  RespuestaServidor,
  RespuestaItemEntrada,
  RespuestaItemsGuardados,
  VitrinaCuenta,
  PresentacionesCuenta,
} from '@/types/servidor'

let inicio: Promise<RespuestaServidor<RespuestaAccion>> | null = null
let ingresoRegistrado: RespuestaAccion | null = null
let revisionIngreso = 0
export function prepararIngreso() {
  revisionIngreso++
  inicio = null
  ingresoRegistrado = null
  limpiarEstadoServidor()
  limpiarEstadoApoderado()
  limpiarNotificaciones()
}
export function ingresar(): Promise<RespuestaServidor<RespuestaAccion>> {
  if (!modoApi)
    return Promise.resolve({ tipo: 'http', estado: 400, detalle: 'El servidor no se usa en modo local.' })
  if (inicio) return inicio
  const turno = revisionIngreso
  const cambioDeCuenta = (): ErrorServidor => ({
    tipo: 'http',
    estado: 409,
    detalle: 'La cuenta activa cambió durante el ingreso.',
  })
  const pendiente = (async () => {
    if (!ingresoRegistrado) {
      const cuenta = cuentaActiva()
      if (!cuenta) {
        const sinSesion: ErrorServidor = { tipo: 'http', estado: 401, detalle: 'No hay una sesión de estudiante.' }
        informarErrorServidor(sinSesion)
        return sinSesion
      }
      prepararAlmacenesApi(cuenta)
      const respuesta = await apiAcciones.ingresar(cuenta)
      if (turno !== revisionIngreso) return cambioDeCuenta()
      if (respuesta.tipo !== 'ok') {
        informarErrorServidor(respuesta)
        return respuesta
      }
      publicar({ consultasHabilitadas: true })
      ingresoRegistrado = respuesta.datos
      revelarDesbloqueos(respuesta.datos.nuevos_desbloqueos)
      // Ajuste notificaciones: la campana se pide con el ingreso; lo que abre el ingreso mismo ya viene en ella.
      void cargarNotificaciones()
    }
    const estado = await refrescar()
    return estado.tipo === 'ok' ? { tipo: 'ok' as const, datos: ingresoRegistrado } : estado
  })()
  inicio = pendiente
  void pendiente.then(() => {
    if (inicio === pendiente) inicio = null
  })
  return pendiente
}
export type Finalizacion =
  | RespuestaServidor<RespuestaCompletarActividad>
  | {
      tipo: 'guardado_sin_refrescar'
      datos: RespuestaCompletarActividad
      error: ErrorServidor
    }
export async function completarActividad(
  actividad: string,
  confirmada?: RespuestaCompletarActividad,
): Promise<Finalizacion> {
  const cuenta = cuentaActiva()
  const sesion = sesionServidor()
  if (!modoApi || !cuenta)
    return { tipo: 'http', estado: 400, detalle: 'No hay una cuenta de servidor activa.' }
  const respuesta: RespuestaServidor<RespuestaCompletarActividad> = confirmada
    ? { tipo: 'ok', datos: confirmada }
    : await apiAcciones.completarActividad(cuenta, actividad)
  if (respuesta.tipo !== 'ok') return respuesta
  if (cuenta !== cuentaActiva() || sesion !== sesionServidor())
    return { tipo: 'http', estado: 409, detalle: 'La cuenta activa cambió durante la acción.' }
  revelarDesbloqueos(respuesta.datos.nuevos_desbloqueos)
  // El cierre de la actividad anuncia lo desbloqueado: sus notificaciones se marcan vistas, sin toast.
  incorporarNotificaciones(respuesta.datos.nuevas_notificaciones, true)
  const estado = await refrescar(respuesta.datos.nuevos_desbloqueos)
  return estado.tipo === 'ok'
    ? respuesta
    : { tipo: 'guardado_sin_refrescar', datos: respuesta.datos, error: estado }
}
export type GuardadoItems =
  | RespuestaServidor<RespuestaItemsGuardados>
  | { tipo: 'guardado_sin_refrescar'; datos: RespuestaItemsGuardados; error: ErrorServidor }
export async function responderItems(
  actividad: string,
  respuestas: RespuestaItemEntrada[],
  confirmada?: RespuestaItemsGuardados,
): Promise<GuardadoItems> {
  const cuenta = cuentaActiva(),
    sesion = sesionServidor()
  if (!modoApi || !cuenta)
    return { tipo: 'http', estado: 400, detalle: 'No hay una cuenta de servidor activa.' }
  const respuesta: RespuestaServidor<RespuestaItemsGuardados> = confirmada
    ? { tipo: 'ok', datos: confirmada }
    : await apiAcciones.responderItems(cuenta, actividad, respuestas)
  if (cuenta !== cuentaActiva() || sesion !== sesionServidor())
    return { tipo: 'http', estado: 409, detalle: 'La cuenta activa cambió durante la acción.' }
  if (respuesta.tipo !== 'ok') return respuesta
  // Ajuste de F03: responder no registra eventos; solo la primera respuesta cambia el estado de la
  // actividad (EN_CURSO). Las demás pasan a la siguiente pregunta sin volver a leer el camino.
  if (respuesta.datos.progreso.respondidos > 1) return respuesta
  const estado = await refrescar([])
  return estado.tipo === 'ok'
    ? respuesta
    : { tipo: 'guardado_sin_refrescar', datos: respuesta.datos, error: estado }
}
export async function reiniciarDatosDePrueba(): Promise<RespuestaServidor<{ mensaje: string }>> {
  if (!modoApi || !desarrollo)
    return {
      tipo: 'http',
      estado: 403,
      detalle: 'El reinicio solo está disponible en desarrollo con datos del servidor.',
    }
  const respuesta = await apiDesarrollo.reiniciar()
  if (respuesta.tipo === 'ok') {
    localStorage.removeItem('ov.missions.v2.api')
    localStorage.removeItem('ov.student-adventure.v1.api')
    prepararIngreso()
  }
  return respuesta
}

// Ajuste pasaporte-perfil: la vitrina se reemplaza completa en el servidor y se refleja en `logros`.
export async function guardarVitrina(codigos: string[]): Promise<RespuestaServidor<VitrinaCuenta>> {
  const cuenta = cuentaActiva(),
    sesion = sesionServidor()
  if (!modoApi || !cuenta) return { tipo: 'http', estado: 400, detalle: 'No hay una cuenta de servidor activa.' }
  const respuesta = await apiLogros.enviarVitrina(cuenta, codigos)
  const logros = obtenerEstadoServidor().logros
  if (respuesta.tipo === 'ok' && cuenta === cuentaActiva() && sesion === sesionServidor() && logros.datos)
    publicar({ logros: { ...logros, datos: { ...logros.datos, vitrina: respuesta.datos.vitrina } } })
  return respuesta
}

// Ajuste presentaciones-vistas: cerrar una presentación de primera visita la marca en el servidor.
export async function marcarPresentacionVista(
  codigo: string,
): Promise<RespuestaServidor<PresentacionesCuenta>> {
  const cuenta = cuentaActiva(),
    sesion = sesionServidor()
  if (!modoApi || !cuenta) return { tipo: 'http', estado: 400, detalle: 'No hay una cuenta de servidor activa.' }
  const respuesta = await apiPresentaciones.enviarPresentacionVista(cuenta, codigo)
  if (respuesta.tipo === 'ok' && cuenta === cuentaActiva() && sesion === sesionServidor())
    publicar({ presentaciones: { datos: respuesta.datos, estado: 'listo', error: null } })
  return respuesta
}
