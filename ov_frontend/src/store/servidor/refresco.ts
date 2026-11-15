import { useSyncExternalStore } from 'react'
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
import type { NombreSeccion } from './sesion'
import { encolarPorRevelar, revelarDesbloqueos } from './revelado'
import { incorporarNotificaciones } from './notificaciones'
import { cargarResultadoRiasec } from './resultado'
import type {
  BloqueActividades,
  DesbloqueoNuevo,
  ErrorServidor,
  RespuestaAccion,
  RespuestaServidor,
} from '@/types/servidor'
let revision = 0
const checkInAbierto = () =>
  !!obtenerEstadoServidor().secciones.datos?.some((s) => s.codigo === 'CHECK_IN' && s.estado === 'DISPONIBLE')
const visibles = (bloques: BloqueActividades[] | null) =>
  bloques?.flatMap((b) => b.actividades.filter((a) => a.visible).map((a) => a.codigo))
// Auditoría plataforma (F2b): cada acción confirmada suma una revisión. Lo que muestra condiciones con «actual de
// requerido» (`GET progreso`: Ciudad cerrada, ficha o voz bloqueada) se vuelve a pedir con ella, haya refrescado el
// camino o no, porque esos conteos cambian con los eventos y no siempre con un desbloqueo.
let revisionAcciones = 0
const oyentesAcciones = new Set<() => void>()
function avisarAccion() {
  revisionAcciones++
  oyentesAcciones.forEach((oyente) => oyente())
}
const suscribirAcciones = (oyente: () => void) => {
  oyentesAcciones.add(oyente)
  return () => {
    oyentesAcciones.delete(oyente)
  }
}
export const useRevisionAcciones = () => useSyncExternalStore(suscribirAcciones, () => revisionAcciones)

// Auditoría plataforma (F2b): el progreso de una actividad solo cambia al completarla, responder sus ítems, reiniciar
// un instrumento, en batallas, casos y registros. Las demás acciones (diario, cartas, planes, investigaciones, vistas
// del catálogo) solo cambian el camino, el avance o las secciones con un desbloqueo, que viene en su respuesta.
// Ajuste logros: una insignia no cambia el camino; si todo lo desbloqueado son insignias, solo se vence `logros`.
export const conDesbloqueos = (datos: RespuestaAccion) =>
  datos.nuevos_desbloqueos.some((d) => d.tipo_objetivo !== 'INSIGNIA')
// Una sección que el refresco ya venció por un desbloqueo (y ya pidió si está montada) no se vence otra vez.
export function vencerSiNoRefrescada(nombre: NombreSeccion, datos: RespuestaAccion | undefined) {
  if (datos && seccionesPorDesbloqueos(datos.nuevos_desbloqueos).includes(nombre)) return
  vencerSeccion(nombre)
}

export async function refrescar(desbloqueos?: DesbloqueoNuevo[]): Promise<RespuestaServidor<null>> {
  const respuesta = await refrescarCamino(desbloqueos)
  if (desbloqueos !== undefined) avisarAccion()
  return respuesta
}

async function refrescarCamino(desbloqueos?: DesbloqueoNuevo[]): Promise<RespuestaServidor<null>> {
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
  // Ajuste del panel (F05): el avance cambia con cada actividad; se vence y se pide con ellas (conserva el último).
  vencerSeccion('avance')
  // F00: las secciones del perfil se ven siempre (accesos del panel): van con el ingreso, como el resumen.
  const nombres =
    desbloqueos === undefined ? (['resumen', 'secciones'] as const) : seccionesPorDesbloqueos(desbloqueos)
  nombres.forEach(vencerSeccion)
  const pedidos: Promise<RespuestaServidor<unknown>>[] = [
    asegurarSeccion('actividades'),
    asegurarSeccion('avance'),
  ]
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
  // Ajuste presentaciones-vistas: deciden la presentación de la vista al entrar; ninguna acción las cambia.
  if (obtenerEstadoServidor().presentaciones.estado === 'error') vencerSeccion('presentaciones')
  if (obtenerEstadoServidor().presentaciones.estado !== 'listo') pedidos.push(asegurarSeccion('presentaciones'))
  pedidos.push(...cargarVencidasMontadas())
  const respuestas = await Promise.all(pedidos)
  if (!vigente()) return cambioCuenta()
  const error = respuestas.find((r) => r.tipo !== 'ok')
  // F05: con CHECK_IN abierta, los check-ins van con el ingreso (la señal se ve siempre en el panel) y se
  // vuelven a pedir cuando una acción abre la sección. Si fallan, solo la señal queda sin datos.
  if (!error && checkInAbierto() && obtenerEstadoServidor().checkIns.estado !== 'listo') {
    if (obtenerEstadoServidor().checkIns.estado === 'error') vencerSeccion('checkIns')
    await asegurarSeccion('checkIns')
    if (!vigente()) return cambioCuenta()
  }
  publicar({ cargando: false, error: error ?? null })
  if (error) return error
  if (desbloqueos !== undefined && visiblesAntes) {
    const ahora = visibles(obtenerEstadoServidor().actividades.datos) ?? []
    encolarPorRevelar(ahora.filter((codigo) => !visiblesAntes.includes(codigo)))
  }
  const final = actividadServidor(obtenerEstadoServidor().actividades.datos, 'act-tip-final')
  // Auditoría plataforma (F3): el resultado solo cambia al revelar o reiniciar, y esas acciones lo vuelven a leer con
  // el libro (`conInstrumentos`). Ya leído (o sin resultado, 409), no se pide en cada refresco; sí tras un error.
  const resultadoLeido = ['listo', 'pendiente'].includes(obtenerEstadoServidor().estadoResultado)
  if (final && final.estado !== 'BLOQUEADA') {
    if (resultadoLeido) return { tipo: 'ok', datos: null }
    const resultado = await cargarResultadoRiasec()
    if (!vigente()) return cambioCuenta()
    if (resultado.tipo !== 'ok') return resultado
  } else if (
    obtenerEstadoServidor().instrumentos.estado === 'listo' &&
    !obtenerEstadoServidor().instrumentos.resultados['APL-RIASEC']
  )
    // F03: en `ruta` no hay act-tip-final; un resultado RIASEC ya leído por el libro se conserva. Solo el libro
    // cargado dice que no hay resultado: sin él, el que pidió el catálogo tampoco se borra.
    publicar({ resultadoRiasec: null, estadoResultado: 'pendiente', errorResultado: null })
  return { tipo: 'ok', datos: null }
}

export type AccionConRefresco<T extends RespuestaAccion> =
  RespuestaServidor<T> | { tipo: 'guardado_sin_refrescar'; datos: T; error: ErrorServidor }
// Una acción con eventos y desbloqueos refresca el camino como completar: toasts y revelado de opcionales.
// Con `confirmada`, solo se reintenta el refresco de una acción que el servidor ya guardó. Con `conCierre` (batalla
// y caso), su pantalla de cierre anuncia lo desbloqueado: las notificaciones se marcan vistas, sin toast.
// Auditoría plataforma: con `refrescarSi`, la acción solo refresca el camino si su respuesta lo pide (lo que cambia el
// mapa llega declarado: desbloqueos y eventos de completar). Sin él, refresca siempre.
export async function accionConRefresco<T extends RespuestaAccion>(
  accion: (cuenta: string) => Promise<RespuestaServidor<T>>,
  confirmada?: T,
  conCierre = false,
  refrescarSi?: (datos: T) => boolean,
): Promise<AccionConRefresco<T>> {
  const cuenta = cuentaActiva()
  const sesion = sesionServidor()
  if (!modoApi || !cuenta)
    return { tipo: 'http', estado: 400, detalle: 'No hay una cuenta de servidor activa.' }
  const respuesta: RespuestaServidor<T> = confirmada
    ? { tipo: 'ok', datos: confirmada }
    : await accion(cuenta)
  if (respuesta.tipo !== 'ok') return respuesta
  if (cuenta !== cuentaActiva() || sesion !== sesionServidor())
    return { tipo: 'http', estado: 409, detalle: 'La cuenta activa cambió durante la acción.' }
  revelarDesbloqueos(respuesta.datos.nuevos_desbloqueos)
  incorporarNotificaciones(respuesta.datos.nuevas_notificaciones, conCierre)
  if (refrescarSi && !refrescarSi(respuesta.datos)) {
    // Ajuste logros: sin refrescar el camino, las insignias nuevas solo vencen el pasaporte (y lo piden si se ve).
    if (respuesta.datos.nuevos_desbloqueos.length > 0) {
      vencerSeccion('logros')
      await Promise.all(cargarVencidasMontadas())
    }
    avisarAccion()
    return respuesta
  }
  const estado = await refrescar(respuesta.datos.nuevos_desbloqueos)
  return estado.tipo === 'ok'
    ? respuesta
    : { tipo: 'guardado_sin_refrescar', datos: respuesta.datos, error: estado }
}
