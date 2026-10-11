import { useEffect } from 'react'
import { modoApi } from '@/config/env'
import { obtenerResumen } from '@/services/api/cuentas'
import { obtenerActividades } from '@/services/api/actividades'
import { obtenerFichas } from '@/services/api/fichas'
import { obtenerLogros } from '@/services/api/logros'
import { hidratarJourneyServidor } from '../journeyStore'
import { hidratarAdventureServidor } from '../adventureStore'
import { baseRoute } from '@/data/activities/reflectionConfig'
import { misionesCompletadas, proyectarJourney } from '@/lib/servidor/adaptadores'
import { cuentaActiva } from './cuenta'
import {
  cambioCuenta,
  consultarCuenta,
  obtenerEstadoServidor,
  prepararAlmacenesApi,
  publicar,
  sesionServidor,
  useEstadoServidor,
} from './sesion'
import type { DatosSecciones, NombreSeccion, Seccion } from './sesion'
import type { DesbloqueoNuevo, RespuestaServidor } from '@/types/servidor'

const consultas = {
  resumen: obtenerResumen,
  actividades: obtenerActividades,
  fichas: obtenerFichas,
  logros: obtenerLogros,
}
const revisiones = { resumen: 0, actividades: 0, fichas: 0, logros: 0 }
const consumidores = { resumen: 0, actividades: 0, fichas: 0, logros: 0 }
const pendientes = new Map<
  NombreSeccion,
  { sesion: number; cuenta: string; revision: number; promesa: Promise<RespuestaServidor<unknown>> }
>()

function publicarSeccion<N extends NombreSeccion>(nombre: N, seccion: Seccion<DatosSecciones[N]>) {
  publicar({ [nombre]: seccion })
}
export function asegurarSeccion<N extends NombreSeccion>(
  nombre: N,
): Promise<RespuestaServidor<DatosSecciones[N]>> {
  const almacen = obtenerEstadoServidor(),
    cuenta = cuentaActiva(),
    sesion = sesionServidor()
  if (!modoApi || !cuenta || !almacen.consultasHabilitadas)
    return Promise.resolve({ tipo: 'http', estado: 400, detalle: 'No hay una cuenta de servidor activa.' })
  const pendiente = pendientes.get(nombre),
    revision = revisiones[nombre]
  if (pendiente?.sesion === sesion && pendiente.cuenta === cuenta && pendiente.revision === revision)
    return pendiente.promesa as Promise<RespuestaServidor<DatosSecciones[N]>>
  const seccion = almacen[nombre] as Seccion<DatosSecciones[N]>
  if (seccion.estado === 'listo') return Promise.resolve({ tipo: 'ok', datos: seccion.datos! })
  if (seccion.estado === 'error') return Promise.resolve(seccion.error!)
  // El aplazamiento registra la promesa antes de que una publicación permita otra carga.
  const tarea = {
    sesion,
    cuenta,
    revision,
    promesa: Promise.resolve()
      .then(async () => {
        if (sesion !== sesionServidor() || cuenta !== cuentaActiva()) return cambioCuenta()
        if (revision !== revisiones[nombre]) return asegurarSeccion(nombre)
        const consultar = consultas[nombre] as (
          cuenta: string,
        ) => Promise<RespuestaServidor<DatosSecciones[N]>>
        const respuesta = await consultarCuenta(consultar)
        if (sesion !== sesionServidor() || cuenta !== cuentaActiva()) return cambioCuenta()
        if (revision !== revisiones[nombre]) return asegurarSeccion(nombre)
        if (respuesta.tipo !== 'ok') {
          publicarSeccion(nombre, {
            ...(obtenerEstadoServidor()[nombre] as Seccion<DatosSecciones[N]>),
            estado: 'error',
            error: respuesta,
          })
          return respuesta
        }
        if (nombre === 'actividades') {
          const bloques = respuesta.datos as DatosSecciones['actividades']
          prepararAlmacenesApi(cuenta)
          hidratarJourneyServidor((actual) => proyectarJourney(bloques, actual, cuenta))
          hidratarAdventureServidor(misionesCompletadas(bloques, baseRoute))
        }
        publicarSeccion(nombre, { datos: respuesta.datos, estado: 'listo', error: null })
        return respuesta
      })
      .finally(() => {
        if (pendientes.get(nombre) === tarea) pendientes.delete(nombre)
      }),
  }
  pendientes.set(nombre, tarea)
  publicarSeccion(nombre, { ...seccion, estado: 'cargando', error: null })
  return tarea.promesa as Promise<RespuestaServidor<DatosSecciones[N]>>
}
export function vencerSeccion(nombre: NombreSeccion) {
  revisiones[nombre]++
  publicarSeccion(nombre, { ...obtenerEstadoServidor()[nombre], estado: 'vencido', error: null })
  if (consumidores[nombre] > 0) void asegurarSeccion(nombre)
}
export function reintentarSeccion<N extends NombreSeccion>(nombre: N) {
  vencerSeccion(nombre)
  return asegurarSeccion(nombre)
}
export function seccionesPorDesbloqueos(desbloqueos: DesbloqueoNuevo[]): NombreSeccion[] {
  const nombres = new Set<NombreSeccion>()
  for (const d of desbloqueos) {
    if (d.tipo_objetivo === 'FICHA') nombres.add('fichas')
    if (d.tipo_objetivo === 'INSIGNIA' || d.tipo_objetivo === 'NIVEL') nombres.add('logros')
    if (d.tipo_objetivo === 'NIVEL') nombres.add('resumen')
  }
  return [...nombres]
}
export function cargarVencidasMontadas() {
  return (Object.keys(consumidores) as NombreSeccion[])
    .filter(
      (n) => consumidores[n] > 0 && ['sin_cargar', 'vencido'].includes(obtenerEstadoServidor()[n].estado),
    )
    .map((n) => asegurarSeccion(n))
}
export function montarSeccion(nombre: NombreSeccion) {
  consumidores[nombre]++
  void asegurarSeccion(nombre)
  return () => {
    consumidores[nombre]--
  }
}
function useSeccion<N extends NombreSeccion>(nombre: N, activo = true): Seccion<DatosSecciones[N]> {
  const almacen = useEstadoServidor(),
    sesion = sesionServidor()
  useEffect(() => {
    if (!modoApi || !activo || !almacen.consultasHabilitadas) return
    const desmontar = montarSeccion(nombre)
    return desmontar
  }, [nombre, activo, sesion, almacen.consultasHabilitadas])
  return almacen[nombre] as Seccion<DatosSecciones[N]>
}
export const useResumenServidor = (activo = true) => useSeccion('resumen', activo)
export const useActividadesServidor = (activo = true) => useSeccion('actividades', activo)
export const useFichasServidor = (activo = true) => useSeccion('fichas', activo)
export const useLogrosServidor = (activo = true) => useSeccion('logros', activo)

export function errorSeccionesActivas() {
  return (
    (Object.keys(consumidores) as NombreSeccion[])
      .filter((n) => consumidores[n] > 0)
      .map((n) => obtenerEstadoServidor()[n].error)
      .find(Boolean) ?? null
  )
}
export function vencerErroresActivos() {
  for (const n of Object.keys(consumidores) as NombreSeccion[])
    if (
      n !== 'resumen' &&
      n !== 'actividades' &&
      consumidores[n] > 0 &&
      obtenerEstadoServidor()[n].estado === 'error'
    )
      vencerSeccion(n)
}
