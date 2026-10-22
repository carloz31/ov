import * as apiInstrumentos from '@/services/api/instrumentos'
import * as apiAcciones from '@/services/api/acciones'
import { modoApi } from '@/config/env'
import {
  APLICACION_LLEGADA,
  APLICACION_PARTIDA,
  APLICACION_RIASEC,
  aplicacionesReveladas,
} from '@/lib/servidor/adaptadoresInstrumentos'
import { cuentaActiva } from './cuenta'
import {
  cambioCuenta,
  consultarCuenta,
  obtenerEstadoServidor,
  publicar,
  sesionServidor,
  type EstadoInstrumentos,
} from './sesion'
import { accionConRefresco, type AccionConRefresco } from './refresco'
import type {
  ErrorServidor,
  RespuestaReiniciarInstrumento,
  RespuestaRevelarResultado,
  RespuestaServidor,
  ResultadoPublico,
} from '@/types/servidor'

// F03: avance, resultados vigentes por aplicación, comparación partida–llegada e historial RIASEC con perfil
// plano. Se pide al abrir el libro de Helena o su vista explicada, y otra vez tras revelar o reiniciar.
let revision = 0
let consulta: { cuenta: string | null; sesion: number; promesa: Promise<RespuestaServidor<null>> } | null = null
const publicarInstrumentos = (cambios: Partial<EstadoInstrumentos>) =>
  publicar({ instrumentos: { ...obtenerEstadoServidor().instrumentos, ...cambios } })

export function cargarInstrumentos(forzar = false): Promise<RespuestaServidor<null>> {
  const cuenta = cuentaActiva(),
    sesion = sesionServidor()
  if (!forzar && consulta?.cuenta === cuenta && consulta.sesion === sesion) return consulta.promesa
  const actual = { cuenta, sesion, promesa: consultarInstrumentos() }
  consulta = actual
  void actual.promesa.finally(() => {
    if (consulta === actual) consulta = null
  })
  return actual.promesa
}

async function consultarInstrumentos(): Promise<RespuestaServidor<null>> {
  if (!modoApi) return { tipo: 'http', estado: 400, detalle: 'El servidor no se usa en modo local.' }
  const sesion = sesionServidor(),
    cuenta = cuentaActiva(),
    turno = ++revision
  const vigente = () => turno === revision && sesion === sesionServidor() && cuenta === cuentaActiva()
  publicarInstrumentos({ estado: 'cargando', error: null })
  const fallo = (error: ErrorServidor): RespuestaServidor<null> => {
    if (!vigente()) return cambioCuenta()
    publicarInstrumentos({ estado: 'error', error })
    return error
  }
  const avance = await consultarCuenta(apiInstrumentos.obtenerAvance)
  if (avance.tipo !== 'ok') return fallo(avance)
  const reveladas = aplicacionesReveladas(avance.datos)
  const respuestas = await Promise.all(
    reveladas.map(({ instrumento, aplicacion }) =>
      consultarCuenta((c) => apiInstrumentos.obtenerResultado(c, instrumento, aplicacion)),
    ),
  )
  const error = respuestas.find((r): r is ErrorServidor => r.tipo !== 'ok')
  if (error) return fallo(error)
  const resultados: Record<string, ResultadoPublico> = {}
  respuestas.forEach((r, i) => {
    if (r.tipo === 'ok') resultados[reveladas[i].aplicacion] = r.datos
  })
  const conComparacion =
    resultados[APLICACION_PARTIDA.aplicacion] && resultados[APLICACION_LLEGADA.aplicacion]
  const conHistorial = resultados[APLICACION_RIASEC.aplicacion]?.perfil_plano
  const [comparacion, historial] = await Promise.all([
    conComparacion
      ? consultarCuenta((c) => apiInstrumentos.obtenerComparacion(c, APLICACION_PARTIDA.instrumento))
      : null,
    conHistorial ? consultarCuenta((c) => apiInstrumentos.obtenerHistorial(c, APLICACION_RIASEC.instrumento)) : null,
  ])
  if (comparacion && comparacion.tipo !== 'ok') return fallo(comparacion)
  if (historial && historial.tipo !== 'ok') return fallo(historial)
  if (!vigente()) return cambioCuenta()
  const riasec = resultados[APLICACION_RIASEC.aplicacion] ?? null
  publicar({
    // El resultado RIASEC sigue en su lugar para el catálogo y el nodo de resultado.
    resultadoRiasec: riasec,
    estadoResultado: riasec ? 'listo' : 'pendiente',
    errorResultado: null,
    instrumentos: {
      estado: 'listo',
      error: null,
      avance: avance.datos,
      resultados,
      comparacion: comparacion?.datos ?? null,
      historialRiasec: historial?.datos ?? null,
    },
  })
  return { tipo: 'ok', datos: null }
}

// HU-027: calcula y guarda el resultado; refresca el camino (abre t-contraste o T2) y lo que lee el libro.
export async function revelarResultado(
  instrumento: string,
  aplicacion: string,
): Promise<AccionConRefresco<RespuestaRevelarResultado>> {
  const respuesta = await accionConRefresco((cuenta) =>
    apiAcciones.revelarResultado(cuenta, instrumento, aplicacion),
  )
  return conInstrumentos(respuesta)
}

// HU-095: anula el resultado plano y deja las misiones en curso; refresca el camino y el libro.
export async function reiniciarInstrumento(
  instrumento: string,
  aplicacion: string,
): Promise<AccionConRefresco<RespuestaReiniciarInstrumento>> {
  const respuesta = await accionConRefresco((cuenta) =>
    apiAcciones.reiniciarInstrumento(cuenta, instrumento, aplicacion),
  )
  return conInstrumentos(respuesta)
}

async function conInstrumentos<T extends RespuestaRevelarResultado | RespuestaReiniciarInstrumento>(
  respuesta: AccionConRefresco<T>,
): Promise<AccionConRefresco<T>> {
  if (respuesta.tipo !== 'ok' && respuesta.tipo !== 'guardado_sin_refrescar') return respuesta
  const libro = await cargarInstrumentos(true)
  if (respuesta.tipo === 'ok' && libro.tipo !== 'ok')
    return { tipo: 'guardado_sin_refrescar', datos: respuesta.datos, error: libro }
  return respuesta
}
