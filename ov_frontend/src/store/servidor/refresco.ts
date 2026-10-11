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
import { consultarNoVistos } from './avisos'
import { cargarResultadoRiasec } from './resultado'
import type { DesbloqueoNuevo, RespuestaServidor } from '@/types/servidor'
let revision = 0
export async function refrescar(desbloqueos?: DesbloqueoNuevo[]): Promise<RespuestaServidor<null>> {
  const sesion = sesionServidor(),
    cuenta = cuentaActiva(),
    turno = ++revision
  if (!modoApi || !cuenta || !obtenerEstadoServidor().consultasHabilitadas)
    return { tipo: 'http', estado: 400, detalle: 'No hay un ingreso confirmado.' }
  const vigente = () => sesion === sesionServidor() && cuenta === cuentaActiva() && turno === revision
  publicar({ cargando: true, error: null })
  if (desbloqueos === undefined) vencerErroresActivos()
  vencerSeccion('actividades')
  const nombres = desbloqueos === undefined ? (['resumen'] as const) : seccionesPorDesbloqueos(desbloqueos)
  nombres.forEach(vencerSeccion)
  const pedidos: Promise<RespuestaServidor<unknown>>[] = [asegurarSeccion('actividades'), consultarNoVistos()]
  if (
    desbloqueos === undefined ||
    nombres.includes('resumen') ||
    obtenerEstadoServidor().resumen.estado !== 'listo'
  )
    pedidos.push(asegurarSeccion('resumen'))
  pedidos.push(...cargarVencidasMontadas())
  const respuestas = await Promise.all(pedidos)
  if (!vigente()) return cambioCuenta()
  const error = respuestas.find((r) => r.tipo !== 'ok')
  publicar({ cargando: false, error: error ?? null })
  if (error) return error
  const final = actividadServidor(obtenerEstadoServidor().actividades.datos, 'act-tip-final')
  if (final && final.estado !== 'BLOQUEADA') {
    const resultado = await cargarResultadoRiasec()
    if (!vigente()) return cambioCuenta()
    if (resultado.tipo !== 'ok') return resultado
  } else publicar({ resultadoRiasec: null, estadoResultado: 'pendiente', errorResultado: null })
  return { tipo: 'ok', datos: null }
}
