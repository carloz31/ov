import * as apiPlanes from '@/services/api/planes'
import type { GuardarSeccionPlan, MedidoresEntrada } from '@/types/servidor'
import { accionConRefresco, conDesbloqueos, vencerSiNoRefrescada } from './refresco'
import { asegurarSeccion } from './secciones'

// F07a: acciones sobre los planes. Responden eventos y desbloqueos, no la tarjeta: vencen `planes`, que la vista
// montada vuelve a pedir (el servidor calcula estados, totales, letras y avisos). Auditoría plataforma (F2b, F7): el
// camino solo se refresca si abrieron algo (crear y guardar pueden abrir t-comparar), y `planes` no se pide dos veces
// cuando el refresco ya la venció por un SECCION_PLAN.
async function accionPlanes(accion: Parameters<typeof accionConRefresco>[0]) {
  const respuesta = await accionConRefresco(accion, undefined, false, conDesbloqueos)
  if (respuesta.tipo === 'ok') vencerSiNoRefrescada('planes', respuesta.datos)
  else if (respuesta.tipo === 'guardado_sin_refrescar') vencerSiNoRefrescada('planes', undefined)
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
