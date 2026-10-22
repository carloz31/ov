import { modoApi } from '@/config/env'
import { actividadServidor } from '@/lib/servidor/adaptadores'
import { cuentaActiva } from './cuenta'
import { cambioCuenta, obtenerEstadoServidor, publicar, sesionServidor } from './sesion'
import {
  asegurarSeccion,
  cargarVencidasMontadas,
  seccionesPorDesbloqueos,
  vencerSeccion,
  vencerErroresActivos,
} from './secciones'
import { consultarNoVistos, encolarPorRevelar, incorporarDesbloqueos } from './avisos'
import { cargarResultadoRiasec } from './resultado'
import type {
  BloqueActividades,
  DesbloqueoNuevo,
  ErrorServidor,
  RespuestaAccion,
  RespuestaServidor,
} from '@/types/servidor'
let revision = 0
const visibles = (bloques: BloqueActividades[] | null) =>
  bloques?.flatMap((b) => b.actividades.filter((a) => a.visible).map((a) => a.codigo))
export async function refrescar(desbloqueos?: DesbloqueoNuevo[]): Promise<RespuestaServidor<null>> {
  const sesion = sesionServidor(),
    cuenta = cuentaActiva(),
    turno = ++revision
  if (!modoApi || !cuenta || !obtenerEstadoServidor().consultasHabilitadas)
    return { tipo: 'http', estado: 400, detalle: 'No hay un ingreso confirmado.' }
  const vigente = () => sesion === sesionServidor() && cuenta === cuentaActiva() && turno === revision
  publicar({ cargando: true, error: null })
  if (desbloqueos === undefined) vencerErroresActivos()
  // F00: lo que una acción vuelve visible (una opcional que se abre con su bloque) se revela en el mapa.
  const visiblesAntes = visibles(obtenerEstadoServidor().actividades.datos)
  vencerSeccion('actividades')
  // F00: las secciones del perfil se ven siempre (accesos del panel): van con el ingreso, como el resumen.
  const nombres =
    desbloqueos === undefined ? (['resumen', 'secciones'] as const) : seccionesPorDesbloqueos(desbloqueos)
  nombres.forEach(vencerSeccion)
  const pedidos: Promise<RespuestaServidor<unknown>>[] = [asegurarSeccion('actividades'), consultarNoVistos()]
  if (
    desbloqueos === undefined ||
    nombres.includes('resumen') ||
    obtenerEstadoServidor().resumen.estado !== 'listo'
  )
    pedidos.push(asegurarSeccion('resumen'))
  if (obtenerEstadoServidor().secciones.estado === 'error') vencerSeccion('secciones')
  if (
    (nombres as readonly string[]).includes('secciones') ||
    obtenerEstadoServidor().secciones.estado !== 'listo'
  )
    pedidos.push(asegurarSeccion('secciones'))
  pedidos.push(...cargarVencidasMontadas())
  const respuestas = await Promise.all(pedidos)
  if (!vigente()) return cambioCuenta()
  const error = respuestas.find((r) => r.tipo !== 'ok')
  publicar({ cargando: false, error: error ?? null })
  if (error) return error
  if (desbloqueos !== undefined && visiblesAntes) {
    const ahora = visibles(obtenerEstadoServidor().actividades.datos) ?? []
    encolarPorRevelar(ahora.filter((codigo) => !visiblesAntes.includes(codigo)))
  }
  const final = actividadServidor(obtenerEstadoServidor().actividades.datos, 'act-tip-final')
  if (final && final.estado !== 'BLOQUEADA') {
    const resultado = await cargarResultadoRiasec()
    if (!vigente()) return cambioCuenta()
    if (resultado.tipo !== 'ok') return resultado
  } else publicar({ resultadoRiasec: null, estadoResultado: 'pendiente', errorResultado: null })
  return { tipo: 'ok', datos: null }
}

export type AccionConRefresco<T extends RespuestaAccion> =
  | RespuestaServidor<T>
  | { tipo: 'guardado_sin_refrescar'; datos: T; error: ErrorServidor }
// Una acción con eventos y desbloqueos refresca el camino como completar: toasts y revelado de opcionales.
// Con `confirmada`, solo se reintenta el refresco de una acción que el servidor ya guardó.
export async function accionConRefresco<T extends RespuestaAccion>(
  accion: (cuenta: string) => Promise<RespuestaServidor<T>>,
  confirmada?: T,
): Promise<AccionConRefresco<T>> {
  const cuenta = cuentaActiva()
  const sesion = sesionServidor()
  if (!modoApi || !cuenta) return { tipo: 'http', estado: 400, detalle: 'No hay una cuenta de servidor activa.' }
  const respuesta: RespuestaServidor<T> = confirmada ? { tipo: 'ok', datos: confirmada } : await accion(cuenta)
  if (respuesta.tipo !== 'ok') return respuesta
  if (cuenta !== cuentaActiva() || sesion !== sesionServidor())
    return { tipo: 'http', estado: 409, detalle: 'La cuenta activa cambió durante la acción.' }
  incorporarDesbloqueos(respuesta.datos.nuevos_desbloqueos)
  const estado = await refrescar(respuesta.datos.nuevos_desbloqueos)
  return estado.tipo === 'ok' ? respuesta : { tipo: 'guardado_sin_refrescar', datos: respuesta.datos, error: estado }
}
