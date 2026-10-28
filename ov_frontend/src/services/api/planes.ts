import { enviar, obtener } from './cliente'
import type { GuardarSeccionPlan, PlanesCuenta, RespuestaAccion, RespuestaServidor } from '@/types/servidor'

// Planes de carrera (B11; F07a): la consulta y las acciones de la tarjeta. Medidores y paso hecho llegan en F07b.
export function obtenerPlanes(cuenta: string): Promise<RespuestaServidor<PlanesCuenta>> {
  return obtener(`/cuentas/${encodeURIComponent(cuenta)}/planes`)
}

export function enviarCrearPlan(cuenta: string, carrera: string): Promise<RespuestaServidor<RespuestaAccion>> {
  return enviar('/acciones/planes/crear', { cuenta, carrera })
}

export function enviarGuardarSeccion(
  cuenta: string,
  carrera: string,
  seccion: GuardarSeccionPlan,
): Promise<RespuestaServidor<RespuestaAccion>> {
  return enviar('/acciones/planes/guardar-seccion', { cuenta, carrera, ...seccion })
}

// `carreras`: las de todos los planes, en el orden A, B, C.
export function enviarOrdenarPlanes(cuenta: string, carreras: string[]): Promise<RespuestaServidor<RespuestaAccion>> {
  return enviar('/acciones/planes/ordenar', { cuenta, carreras })
}

export function enviarEliminarPlan(cuenta: string, carrera: string): Promise<RespuestaServidor<RespuestaAccion>> {
  return enviar('/acciones/planes/eliminar', { cuenta, carrera })
}
