import { useSyncExternalStore } from 'react'
import { configurarJourneyServidor } from '../journeyStore'
import { configurarAdventureServidor } from '../adventureStore'
import { ciudadDisponible } from '@/lib/servidor/adaptadores'
import { modoApi } from '@/config/env'
import { cuentaActiva } from './cuenta'
import type {
  BloqueActividades,
  ContenidoEstado,
  ResumenCuenta,
  LogrosCuenta,
  DesbloqueoLegible,
  DesbloqueoNuevo,
  ErrorServidor,
  RespuestaServidor,
  ResultadoPublico,
} from '@/types/servidor'

export type Seccion<T> = {
  datos: T | null
  estado: 'sin_cargar' | 'cargando' | 'listo' | 'vencido' | 'error'
  error: ErrorServidor | null
}
export type DatosSecciones = {
  resumen: ResumenCuenta
  actividades: BloqueActividades[]
  fichas: ContenidoEstado[]
  logros: LogrosCuenta
}
export type NombreSeccion = keyof DatosSecciones
export type AlmacenServidor = { [N in NombreSeccion]: Seccion<DatosSecciones[N]> } & {
  cargando: boolean
  error: ErrorServidor | null
  consultasHabilitadas: boolean
  noVistos: DesbloqueoLegible[]
  desbloqueosAccion: DesbloqueoNuevo[]
  avisosMostrados: string[]
  errorAvisos: ErrorServidor | null
  procesandoAvisos: boolean
  marcadoAvisos: string[] | null
  fechasInsignias: Record<string, string>
  resultadoRiasec: ResultadoPublico | null
  estadoResultado: 'sin_cargar' | 'cargando' | 'pendiente' | 'listo' | 'error'
  errorResultado: ErrorServidor | null
}
function vacia<T>(): Seccion<T> {
  return { datos: null, estado: 'sin_cargar', error: null }
}
const inicial = (): AlmacenServidor => ({
  resumen: vacia(),
  actividades: vacia(),
  fichas: vacia(),
  logros: vacia(),
  cargando: false,
  error: null,
  consultasHabilitadas: false,
  noVistos: [],
  desbloqueosAccion: [],
  avisosMostrados: [],
  errorAvisos: null,
  procesandoAvisos: false,
  marcadoAvisos: null,
  fechasInsignias: {},
  resultadoRiasec: null,
  estadoResultado: 'sin_cargar',
  errorResultado: null,
})
let almacen = inicial()
let revisionCuenta = 0
export const sesionServidor = () => revisionCuenta
const oyentes = new Set<() => void>()
export function publicar(cambios: Partial<AlmacenServidor>) {
  almacen = { ...almacen, ...cambios }
  oyentes.forEach((oyente) => oyente())
}
export const obtenerEstadoServidor = () => almacen
export const suscribirServidor = (oyente: () => void) => {
  oyentes.add(oyente)
  return () => {
    oyentes.delete(oyente)
  }
}
export const useEstadoServidor = () => useSyncExternalStore(suscribirServidor, obtenerEstadoServidor)
export function prepararAlmacenesApi(cuenta = cuentaActiva() ?? 'est-ana') {
  if (!modoApi) return
  configurarJourneyServidor(cuenta)
  configurarAdventureServidor(cuenta, () => ciudadDisponible(almacen.actividades.datos))
}
export function limpiarEstadoServidor() {
  revisionCuenta++
  almacen = inicial()
  oyentes.forEach((oyente) => oyente())
}
export function informarErrorServidor(error: ErrorServidor) {
  publicar({ cargando: false, error })
}
export const cambioCuenta = (): ErrorServidor => ({
  tipo: 'http',
  estado: 409,
  detalle: 'La cuenta activa cambió durante la consulta.',
})
export async function consultarCuenta<T>(
  consulta: (cuenta: string) => Promise<RespuestaServidor<T>>,
): Promise<RespuestaServidor<T>> {
  const cuenta = cuentaActiva(),
    sesion = revisionCuenta
  if (!modoApi || !cuenta)
    return { tipo: 'http', estado: 400, detalle: 'No hay una cuenta de servidor activa.' }
  const respuesta = await consulta(cuenta)
  return cuenta === cuentaActiva() && sesion === revisionCuenta ? respuesta : cambioCuenta()
}
export function mensajeErrorServidor(error: ErrorServidor | null) {
  if (!error) return ''
  if (error.tipo === 'sin_conexion') return 'No se pudo conectar con el servidor. Vuelve a intentarlo.'
  if (error.tipo === 'bloqueado') return error.detalle.mensaje ?? 'La acción no está disponible.'
  const detalle = error.detalle
  return typeof detalle === 'string'
    ? detalle
    : detalle && typeof detalle === 'object' && 'mensaje' in detalle
      ? String(detalle.mensaje)
      : `No se pudo consultar el servidor (${error.estado}).`
}
