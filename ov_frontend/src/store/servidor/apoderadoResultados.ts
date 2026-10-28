import { useEffect, useSyncExternalStore } from 'react'
import { modoApi } from '@/config/env'
import { consultarResultadosHijo, obtenerEstadoApoderado } from './apoderado'
import type { Seccion } from './sesion'
import type { ErrorServidor, InstrumentoPublico, RespuestaServidor, ResultadoPublico } from '@/types/servidor'

// Ajuste inicio-apoderado: los resultados de cada hijo (GET /cuentas/{c}/familia/resultados?estudiante=), una
// sección por hijo con el catálogo para sus nombres. Activo es el último hijo pedido: lo que llega de otro hijo
// se descarta y su sección queda por pedir. Los cambia el hijo (revela), así que se revalidan al montar la vista.
export type ResultadosHijo = { resultados: ResultadoPublico[]; catalogo: InstrumentoPublico[] }
type AlmacenResultadosHijo = {
  // La cuenta del apoderado a la que pertenece lo cargado; si la sesión cambia, se descarta.
  cuenta: string | null
  activo: string | null
  porHijo: Record<string, Seccion<ResultadosHijo>>
}
const inicial = (): AlmacenResultadosHijo => ({ cuenta: null, activo: null, porHijo: {} })
let estado = inicial()
let revision = 0
const pendientes = new Map<string, { revision: number; promesa: Promise<RespuestaServidor<ResultadosHijo>> }>()
const oyentes = new Set<() => void>()
function publicar(cambios: Partial<AlmacenResultadosHijo>) {
  estado = { ...estado, ...cambios }
  oyentes.forEach((oyente) => oyente())
}
function publicarHijo(hijo: string, seccion: Seccion<ResultadosHijo>) {
  publicar({ porHijo: { ...estado.porHijo, [hijo]: seccion } })
}
const vacia = (): Seccion<ResultadosHijo> => ({ datos: null, estado: 'sin_cargar', error: null })
const sinCuenta = (): ErrorServidor => ({ tipo: 'http', estado: 400, detalle: 'No hay una cuenta de apoderado activa.' })
const descartada = (): ErrorServidor => ({
  tipo: 'http',
  estado: 409,
  detalle: 'La respuesta corresponde a otro hijo o a otra sesión.',
})

export const obtenerResultadosHijoAlmacen = () => estado
export const useResultadosHijoAlmacen = () =>
  useSyncExternalStore(
    (oyente) => {
      oyentes.add(oyente)
      return () => oyentes.delete(oyente)
    },
    () => estado,
  )

export function limpiarResultadosHijo() {
  revision++
  pendientes.clear()
  estado = inicial()
  oyentes.forEach((oyente) => oyente())
}

export function asegurarResultadosHijo(hijo: string): Promise<RespuestaServidor<ResultadosHijo>> {
  const cuenta = obtenerEstadoApoderado().cuenta
  if (cuenta && cuenta !== estado.cuenta) {
    limpiarResultadosHijo()
    publicar({ cuenta })
  }
  if (!modoApi || !cuenta) return Promise.resolve(sinCuenta())
  if (estado.activo !== hijo) publicar({ activo: hijo })
  const actual = revision
  const pendiente = pendientes.get(hijo)
  if (pendiente?.revision === actual) return pendiente.promesa
  const seccion = estado.porHijo[hijo] ?? vacia()
  if (seccion.estado === 'listo') return Promise.resolve({ tipo: 'ok', datos: seccion.datos! })
  if (seccion.estado === 'error') return Promise.resolve(seccion.error!)
  const tarea = {
    revision: actual,
    promesa: Promise.resolve()
      .then(async (): Promise<RespuestaServidor<ResultadosHijo>> => {
        const respuesta = await consultarResultadosHijo(hijo)
        if (actual !== revision || cuenta !== obtenerEstadoApoderado().cuenta) return descartada()
        const previa = estado.porHijo[hijo] ?? vacia()
        // Otro hijo pasó a ser el activo mientras llegaba: no se publica y su sección se vuelve a pedir al elegirlo.
        if (estado.activo !== hijo) {
          publicarHijo(hijo, { ...previa, estado: previa.datos ? 'vencido' : 'sin_cargar', error: null })
          return descartada()
        }
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

// Se muestra lo ya leído y se vuelve a pedir.
export function vencerResultadosHijo(hijo: string) {
  revision++
  pendientes.delete(hijo)
  const seccion = estado.porHijo[hijo] ?? vacia()
  publicarHijo(hijo, { ...seccion, estado: 'vencido', error: null })
  return asegurarResultadosHijo(hijo)
}

// Al montar la vista (o al cambiar de hijo) se pide el hijo; si ya estaba cargado o con error, se revalida.
export function useResultadosHijoSeccion(hijo: string | null, activo = true) {
  const almacen = useResultadosHijoAlmacen()
  const cuenta = obtenerEstadoApoderado().cuenta
  useEffect(() => {
    if (!modoApi || !activo || !cuenta || !hijo) return
    const previo = estado.porHijo[hijo]?.estado
    if (previo === 'listo' || previo === 'error') void vencerResultadosHijo(hijo)
    else void asegurarResultadosHijo(hijo)
  }, [activo, cuenta, hijo])
  return {
    seccion: hijo ? (almacen.porHijo[hijo] ?? vacia()) : vacia(),
    reintentar: () => {
      if (hijo) void vencerResultadosHijo(hijo)
    },
  }
}
