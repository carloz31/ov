import * as apiPlanes from '@/services/api/planes'
import type { GuardarSeccionPlan, MedidoresEntrada } from '@/types/servidor'
import { accionConRefresco } from './refresco'
import { asegurarSeccion, vencerSeccion } from './secciones'

// F07a: acciones sobre los planes. Responden eventos y desbloqueos, no la tarjeta: cada una refresca el camino
// como completar (crear y guardar pueden abrir t-comparar) y vence `planes`, que la vista montada vuelve a pedir.
async function accionPlanes(accion: Parameters<typeof accionConRefresco>[0]) {
  const respuesta = await accionConRefresco(accion)
  if (respuesta.tipo === 'ok' || respuesta.tipo === 'guardado_sin_refrescar') vencerSeccion('planes')
  return respuesta
}

export const crearPlan = (carrera: string) =>
  accionPlanes((cuenta) => apiPlanes.enviarCrearPlan(cuenta, carrera))

export const guardarSeccionPlan = (carrera: string, seccion: GuardarSeccionPlan) =>
  accionPlanes((cuenta) => apiPlanes.enviarGuardarSeccion(cuenta, carrera, seccion))

export const fijarMedidores = (carrera: string, medidores: MedidoresEntrada) =>
  accionPlanes((cuenta) => apiPlanes.enviarMedidores(cuenta, carrera, medidores))

export const marcarPasoHecho = (carrera: string, paso: number, hallazgo: string | null) =>
  accionPlanes((cuenta) => apiPlanes.enviarPasoHecho(cuenta, carrera, paso, hallazgo))

// F07b: los planes ya refrescados tras una acción (el aviso de sugerencias se arma con ellos); nulo si no llegan.
export async function planesRefrescados() {
  const respuesta = await asegurarSeccion('planes')
  return respuesta.tipo === 'ok' ? respuesta.datos : null
}

// `carreras`: las de todos los planes, en el orden A, B, C.
export const ordenarPlanes = (carreras: string[]) =>
  accionPlanes((cuenta) => apiPlanes.enviarOrdenarPlanes(cuenta, carreras))

export const eliminarPlan = (carrera: string) =>
  accionPlanes((cuenta) => apiPlanes.enviarEliminarPlan(cuenta, carrera))
