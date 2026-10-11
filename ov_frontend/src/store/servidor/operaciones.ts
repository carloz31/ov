import * as apiCuentas from '@/services/api/cuentas'
import * as apiAcciones from '@/services/api/acciones'
import * as apiDesarrollo from '@/services/api/desarrollo'
import { desarrollo, modoApi } from '@/config/env'
import { cuentaActiva, seleccionarCuenta } from './cuenta'
import { limpiarEstadoApoderado } from './apoderado'
import {
  informarErrorServidor,
  limpiarEstadoServidor,
  prepararAlmacenesApi,
  sesionServidor,
  obtenerEstadoServidor,
  publicar,
} from './sesion'
import {
  incorporarDesbloqueos,
  consultarNoVistos,
  avisosPendientes,
  estadoLoteAvisos,
  terminarAvisosMarcados,
} from './avisos'
import { refrescar } from './refresco'
import type {
  ErrorServidor,
  RespuestaAccion,
  RespuestaCompletarActividad,
  RespuestaServidor,
  RespuestaItemEntrada,
  RespuestaItemsGuardados,
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
      const cuentas = await apiCuentas.listarCuentas()
      if (turno !== revisionIngreso) return cambioDeCuenta()
      if (cuentas.tipo !== 'ok') {
        informarErrorServidor(cuentas)
        return cuentas
      }
      const cuenta = seleccionarCuenta(cuentas.datos)
      prepararAlmacenesApi(cuenta)
      const respuesta = await apiAcciones.ingresar(cuenta)
      if (turno !== revisionIngreso) return cambioDeCuenta()
      if (respuesta.tipo !== 'ok') {
        informarErrorServidor(respuesta)
        return respuesta
      }
      publicar({ consultasHabilitadas: true })
      ingresoRegistrado = respuesta.datos
      incorporarDesbloqueos(respuesta.datos.nuevos_desbloqueos)
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
  incorporarDesbloqueos(respuesta.datos.nuevos_desbloqueos)
  const estado = await refrescar(respuesta.datos.nuevos_desbloqueos)
  return estado.tipo === 'ok'
    ? respuesta
    : { tipo: 'guardado_sin_refrescar', datos: respuesta.datos, error: estado }
}
let cierreAvisos: Promise<RespuestaServidor<'terminado' | 'nuevos'>> | null = null
let sesionCierre = -1
export function marcarVistos(): Promise<RespuestaServidor<'terminado' | 'nuevos'>> {
  const cuenta = cuentaActiva(),
    sesion = sesionServidor()
  if (!modoApi || !cuenta)
    return Promise.resolve({ tipo: 'http', estado: 400, detalle: 'No hay una cuenta de servidor activa.' })
  if (cierreAvisos && sesionCierre === sesion) return cierreAvisos
  const vigente = () => cuenta === cuentaActiva() && sesion === sesionServidor()
  sesionCierre = sesion
  estadoLoteAvisos({ procesandoAvisos: true, errorAvisos: null })
  const tarea = (async (): Promise<RespuestaServidor<'terminado' | 'nuevos'>> => {
    let ids = obtenerEstadoServidor().marcadoAvisos
    if (!ids) {
      const consulta = await consultarNoVistos()
      if (consulta.tipo !== 'ok') return consulta
      if (avisosPendientes().length) return { tipo: 'ok', datos: 'nuevos' }
      ids = [...obtenerEstadoServidor().avisosMostrados]
      const respuesta = await apiCuentas.marcarDesbloqueosVistos(cuenta)
      if (!vigente())
        return { tipo: 'http', estado: 409, detalle: 'La cuenta activa cambió durante el marcado.' }
      if (respuesta.tipo !== 'ok') return respuesta
      estadoLoteAvisos({ marcadoAvisos: ids })
    }
    const consulta = await consultarNoVistos()
    if (!vigente())
      return { tipo: 'http', estado: 409, detalle: 'La cuenta activa cambió durante el marcado.' }
    if (consulta.tipo !== 'ok') return consulta
    terminarAvisosMarcados(ids)
    return { tipo: 'ok', datos: avisosPendientes().length ? 'nuevos' : 'terminado' }
  })()
  cierreAvisos = tarea
  void tarea.then((respuesta) => {
    if (vigente())
      estadoLoteAvisos({ procesandoAvisos: false, errorAvisos: respuesta.tipo === 'ok' ? null : respuesta })
    if (cierreAvisos === tarea) cierreAvisos = null
  })
  return tarea
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
