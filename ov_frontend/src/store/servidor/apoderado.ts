import { useSyncExternalStore } from 'react'
import { modoApi } from '@/config/env'
import { ingresar, completarActividad } from '@/services/api/acciones'
import { obtenerActividades } from '@/services/api/actividades'
import { obtenerFamilia, obtenerResultadosHijo } from '@/services/api/familia'
import { obtenerCatalogo } from '@/services/api/instrumentos'
import { proyectarJourneyApoderado } from '@/lib/servidor/adaptadores'
import { hidratarParentJourney } from '../parentJourneyStore'
import { cuentaApoderado } from './cuenta'
import type { Seccion } from './sesion'
import type {
  BloqueActividades,
  DesbloqueoNuevo,
  ErrorServidor,
  FamiliaApoderado,
  RespuestaAccion,
  RespuestaCompletarActividad,
  RespuestaServidor,
} from '@/types/servidor'

type AlmacenApoderado = {
  cuenta: string | null
  actividades: Seccion<BloqueActividades[]>
  // GET /cuentas/{c}/familia: avance propio, diploma y el hijo vinculado (F00).
  familia: Seccion<FamiliaApoderado>
  error: ErrorServidor | null
  enviando: string | null
  // F08: lo que abrió la última actividad completada, para su cierre (la vista se vuelve a montar al refrescar).
  cierre: { actividad: string; desbloqueos: DesbloqueoNuevo[] } | null
}
const inicial = (): AlmacenApoderado => ({
  cuenta: null,
  actividades: { datos: null, estado: 'sin_cargar', error: null },
  familia: { datos: null, estado: 'sin_cargar', error: null },
  error: null,
  enviando: null,
  cierre: null,
})
let estado = inicial()
let revisionSesion = 0
let revisionActividades = 0
let revisionFamilia = 0
let consultaFamilia: { revision: number; promesa: Promise<RespuestaServidor<FamiliaApoderado>> } | null = null
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
  revisionFamilia++
  consultaFamilia = null
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
        // B17: la cuenta del apoderado sale de la sesión.
        const cuenta = cuentaApoderado()
        if (!cuenta) {
          const error: ErrorServidor = {
            tipo: 'http',
            estado: 401,
            detalle: 'No hay una sesión de apoderado.',
          }
          publicar({ error })
          return error
        }
        publicar({ cuenta })
        const respuesta = await ingresar(cuenta)
        if (sesion !== revisionSesion || estado.cuenta !== cuenta) return cambioSesion()
        if (respuesta.tipo !== 'ok') {
          publicar({ error: respuesta })
          return respuesta
        }
        ingresoRegistrado = respuesta.datos
      }
      const [actividades, familia] = await Promise.all([
        asegurarActividadesApoderado(),
        asegurarFamiliaApoderado(),
      ])
      if (sesion !== revisionSesion) return cambioSesion()
      if (actividades.tipo !== 'ok') return actividades
      return familia.tipo === 'ok' ? { tipo: 'ok', datos: ingresoRegistrado! } : familia
    })
    .finally(() => {
      if (inicio === pendiente) inicio = null
    })
  inicio = pendiente
  return pendiente
}

// Reintento de la carga inicial del portal: vuelve a pedir lo que falló (ingreso o actividades).
export function reintentarApoderado() {
  if (estado.actividades.estado === 'error') {
    revisionActividades++
    publicar({ actividades: { ...estado.actividades, estado: 'vencido', error: null } })
  }
  if (estado.familia.estado === 'error') vencerFamilia()
  return ingresarApoderado()
}

function vencerFamilia() {
  revisionFamilia++
  publicar({ familia: { ...estado.familia, estado: 'vencido', error: null } })
}

export function asegurarFamiliaApoderado(): Promise<RespuestaServidor<FamiliaApoderado>> {
  const cuenta = estado.cuenta,
    sesion = revisionSesion,
    revision = revisionFamilia
  if (!modoApi || !cuenta || !ingresoRegistrado) return Promise.resolve(sinCuenta())
  if (consultaFamilia?.revision === revision) return consultaFamilia.promesa
  const seccion = estado.familia
  if (seccion.estado === 'listo') return Promise.resolve({ tipo: 'ok', datos: seccion.datos! })
  if (seccion.estado === 'error') return Promise.resolve(seccion.error!)
  const tarea = {
    revision,
    promesa: Promise.resolve()
      .then(async (): Promise<RespuestaServidor<FamiliaApoderado>> => {
        if (sesion !== revisionSesion || cuenta !== estado.cuenta) return cambioSesion()
        const respuesta = await obtenerFamilia(cuenta)
        if (sesion !== revisionSesion || cuenta !== estado.cuenta) return cambioSesion()
        if (revision !== revisionFamilia) return asegurarFamiliaApoderado()
        publicar({
          familia:
            respuesta.tipo === 'ok'
              ? { datos: respuesta.datos, estado: 'listo', error: null }
              : { ...estado.familia, estado: 'error', error: respuesta },
        })
        return respuesta
      })
      .finally(() => {
        if (consultaFamilia === tarea) consultaFamilia = null
      }),
  }
  consultaFamilia = tarea
  publicar({ familia: { ...seccion, estado: 'cargando', error: null } })
  return tarea.promesa
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
        hidratarParentJourney(cuenta, (actual) => proyectarJourneyApoderado(respuesta.datos, actual, cuenta))
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
      publicar({ cierre: { actividad: codigo, desbloqueos: respuesta.datos.nuevos_desbloqueos } })
      revisionActividades++
      publicar({ actividades: { ...estado.actividades, estado: 'vencido', error: null } })
      // El avance de la familia cambia con cada actividad completada.
      vencerFamilia()
      await Promise.all([asegurarActividadesApoderado(), asegurarFamiliaApoderado()])
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

// F03 (HU-022, HU-023): resultados vigentes del hijo visibles al apoderado, con el catálogo para sus nombres.
// Se piden al abrir la vista que los muestra; sin diploma, el servidor responde 409 con su mensaje.
// Ajuste inicio-apoderado: del hijo elegido (`estudiante`).
export async function consultarResultadosHijo(estudiante?: string) {
  const cuenta = estado.cuenta
  if (!modoApi || !cuenta) return sinCuenta()
  const [resultados, catalogo] = await Promise.all([obtenerResultadosHijo(cuenta, estudiante), obtenerCatalogo()])
  if (resultados.tipo !== 'ok') return resultados
  if (catalogo.tipo !== 'ok') return catalogo
  return { tipo: 'ok' as const, datos: { resultados: resultados.datos, catalogo: catalogo.datos } }
}
