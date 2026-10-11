import { useSyncExternalStore } from 'react'
import { modoApi } from '@/config/env'
import { listarCuentas } from '@/services/api/cuentas'
import { ingresar, completarActividad } from '@/services/api/acciones'
import { obtenerActividades } from '@/services/api/actividades'
import { proyectarJourney } from '@/lib/servidor/adaptadores'
import { hidratarParentJourney } from '../parentJourneyStore'
import { usuarioIngreso } from './cuenta'
import type { Seccion } from './sesion'
import type {
  BloqueActividades,
  ErrorServidor,
  RespuestaAccion,
  RespuestaCompletarActividad,
  RespuestaServidor,
} from '@/types/servidor'

type AlmacenApoderado = {
  cuenta: string | null
  actividades: Seccion<BloqueActividades[]>
  error: ErrorServidor | null
  enviando: string | null
}
const inicial = (): AlmacenApoderado => ({
  cuenta: null,
  actividades: { datos: null, estado: 'sin_cargar', error: null },
  error: null,
  enviando: null,
})
let estado = inicial()
let revisionSesion = 0
let revisionActividades = 0
let inicio: Promise<RespuestaServidor<RespuestaAccion>> | null = null
let ingresoRegistrado: RespuestaAccion | null = null
let consulta: { revision: number; promesa: Promise<RespuestaServidor<BloqueActividades[]>> } | null = null
let envio: Promise<RespuestaServidor<RespuestaCompletarActividad>> | null = null
const oyentes = new Set<() => void>()
function publicar(cambios: Partial<AlmacenApoderado>) {
  estado = { ...estado, ...cambios }
  oyentes.forEach((oyente) => oyente())
}
function suscribir(oyente: () => void) {
  oyentes.add(oyente)
  return () => {
    oyentes.delete(oyente)
  }
}
const cambioSesion = (): ErrorServidor => ({
  tipo: 'http',
  estado: 409,
  detalle: 'La sesión del apoderado cambió durante la petición.',
})
const sinCuenta = (): ErrorServidor => ({
  tipo: 'http',
  estado: 400,
  detalle: 'No hay una cuenta de apoderado activa.',
})
export const obtenerEstadoApoderado = () => estado
export const useEstadoApoderado = () => useSyncExternalStore(suscribir, obtenerEstadoApoderado)

export function limpiarEstadoApoderado() {
  revisionSesion++
  revisionActividades++
  inicio = null
  ingresoRegistrado = null
  consulta = null
  envio = null
  estado = inicial()
  oyentes.forEach((oyente) => oyente())
}

export function ingresarApoderado(): Promise<RespuestaServidor<RespuestaAccion>> {
  if (!modoApi) return Promise.resolve(sinCuenta())
  if (inicio) return inicio
  const sesion = revisionSesion
  const pendiente = Promise.resolve()
    .then(async (): Promise<RespuestaServidor<RespuestaAccion>> => {
      if (sesion !== revisionSesion) return cambioSesion()
      if (!ingresoRegistrado) {
        publicar({ error: null })
        const cuentas = await listarCuentas()
        if (sesion !== revisionSesion) return cambioSesion()
        if (cuentas.tipo !== 'ok') {
          publicar({ error: cuentas })
          return cuentas
        }
        const apoderados = cuentas.datos
          .filter((c) => c.rol === 'APODERADO')
          .sort((a, b) => a.codigo.localeCompare(b.codigo))
        const cuenta = apoderados.find((c) => c.codigo === usuarioIngreso()) ?? apoderados[0]
        if (!cuenta) {
          const error: ErrorServidor = {
            tipo: 'http',
            estado: 404,
            detalle: 'No hay cuentas de apoderado disponibles.',
          }
          publicar({ error })
          return error
        }
        publicar({ cuenta: cuenta.codigo })
        const respuesta = await ingresar(cuenta.codigo)
        if (sesion !== revisionSesion || estado.cuenta !== cuenta.codigo) return cambioSesion()
        if (respuesta.tipo !== 'ok') {
          publicar({ error: respuesta })
          return respuesta
        }
        ingresoRegistrado = respuesta.datos
      }
      const actividades = await asegurarActividadesApoderado()
      if (sesion !== revisionSesion) return cambioSesion()
      return actividades.tipo === 'ok' ? { tipo: 'ok', datos: ingresoRegistrado! } : actividades
    })
    .finally(() => {
      if (inicio === pendiente) inicio = null
    })
  inicio = pendiente
  return pendiente
}

export function asegurarActividadesApoderado(): Promise<RespuestaServidor<BloqueActividades[]>> {
  const cuenta = estado.cuenta,
    sesion = revisionSesion,
    revision = revisionActividades
  if (!modoApi || !cuenta || !ingresoRegistrado) return Promise.resolve(sinCuenta())
  if (consulta?.revision === revision) return consulta.promesa
  const seccion = estado.actividades
  if (seccion.estado === 'listo') return Promise.resolve({ tipo: 'ok', datos: seccion.datos! })
  if (seccion.estado === 'error') return Promise.resolve(seccion.error!)
  const tarea = {
    revision,
    promesa: Promise.resolve()
      .then(async (): Promise<RespuestaServidor<BloqueActividades[]>> => {
        if (sesion !== revisionSesion || cuenta !== estado.cuenta) return cambioSesion()
        if (revision !== revisionActividades) return asegurarActividadesApoderado()
        const respuesta = await obtenerActividades(cuenta)
        if (sesion !== revisionSesion || cuenta !== estado.cuenta) return cambioSesion()
        if (revision !== revisionActividades) return asegurarActividadesApoderado()
        if (respuesta.tipo !== 'ok') {
          publicar({ actividades: { ...estado.actividades, estado: 'error', error: respuesta } })
          return respuesta
        }
        hidratarParentJourney(cuenta, (actual) => proyectarJourney(respuesta.datos, actual, cuenta))
        publicar({ actividades: { datos: respuesta.datos, estado: 'listo', error: null } })
        return respuesta
      })
      .finally(() => {
        if (consulta === tarea) consulta = null
      }),
  }
  consulta = tarea
  publicar({ actividades: { ...seccion, estado: 'cargando', error: null } })
  return tarea.promesa
}

export function completarActividadApoderado(
  codigo: string,
): Promise<RespuestaServidor<RespuestaCompletarActividad>> {
  const cuenta = estado.cuenta,
    sesion = revisionSesion
  if (!modoApi || !cuenta || !ingresoRegistrado) return Promise.resolve(sinCuenta())
  if (envio && estado.enviando === codigo) return envio
  if (envio)
    return Promise.resolve({
      tipo: 'http',
      estado: 409,
      detalle: 'Hay otra actividad del apoderado en envío.',
    })
  const pendiente = Promise.resolve()
    .then(async () => {
      if (sesion !== revisionSesion || cuenta !== estado.cuenta) return cambioSesion()
      const respuesta = await completarActividad(cuenta, codigo)
      if (sesion !== revisionSesion || cuenta !== estado.cuenta) return cambioSesion()
      if (respuesta.tipo !== 'ok') return respuesta
      revisionActividades++
      publicar({ actividades: { ...estado.actividades, estado: 'vencido', error: null } })
      await asegurarActividadesApoderado()
      if (sesion !== revisionSesion || cuenta !== estado.cuenta) return cambioSesion()
      return respuesta
    })
    .finally(() => {
      if (envio === pendiente) {
        envio = null
        publicar({ enviando: null })
      }
    })
  envio = pendiente
  publicar({ enviando: codigo })
  return pendiente
}
