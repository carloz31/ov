import * as apiInstrumentos from '@/services/api/instrumentos'
import { modoApi } from '@/config/env'
import { cuentaActiva } from './cuenta'
import { consultarCuenta, publicar, sesionServidor, cambioCuenta } from './sesion'
import type { RespuestaServidor, ResultadoPublico } from '@/types/servidor'
let revisionResultado = 0
let consultaResultado: {
  cuenta: string | null
  sesion: number
  promesa: Promise<RespuestaServidor<ResultadoPublico | null>>
} | null = null
export async function cargarResultadoRiasec(): Promise<RespuestaServidor<ResultadoPublico | null>> {
  const cuenta = cuentaActiva(),
    sesion = sesionServidor()
  if (consultaResultado?.cuenta === cuenta && consultaResultado.sesion === sesion)
    return consultaResultado.promesa
  const consulta = { cuenta, sesion, promesa: consultarResultadoRiasec() }
  consultaResultado = consulta
  try {
    return await consulta.promesa
  } finally {
    if (consultaResultado === consulta) consultaResultado = null
  }
}
async function consultarResultadoRiasec(): Promise<RespuestaServidor<ResultadoPublico | null>> {
  if (!modoApi) return { tipo: 'http', estado: 400, detalle: 'El servidor no se usa en modo local.' }
  const sesion = sesionServidor(),
    cuenta = cuentaActiva()
  const turno = ++revisionResultado
  publicar({ estadoResultado: 'cargando', errorResultado: null })
  const respuesta = await consultarCuenta((cuenta) => apiInstrumentos.obtenerResultado(cuenta, 'TEST-RIASEC'))
  if (turno !== revisionResultado || sesion !== sesionServidor() || cuenta !== cuentaActiva())
    return cambioCuenta()
  if (respuesta.tipo === 'ok') {
    publicar({ resultadoRiasec: respuesta.datos, estadoResultado: 'listo', errorResultado: null })
    return respuesta
  }
  if (respuesta.tipo === 'bloqueado' && respuesta.detalle.avance) {
    publicar({ resultadoRiasec: null, estadoResultado: 'pendiente', errorResultado: null })
    return { tipo: 'ok', datos: null }
  }
  publicar({ resultadoRiasec: null, estadoResultado: 'error', errorResultado: respuesta })
  return respuesta
}
