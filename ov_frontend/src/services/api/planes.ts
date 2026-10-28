import { enviar, obtener } from './cliente'
import type {
  GuardarSeccionPlan,
  MedidoresEntrada,
  PlanesCuenta,
  RespuestaAccion,
  RespuestaServidor,
} from '@/types/servidor'

// Planes de carrera (B11; F07a–F07b): la consulta y las acciones de la tarjeta.
export function obtenerPlanes(cuenta: string): Promise<RespuestaServidor<PlanesCuenta>> {
  return obtener(`/cuentas/${encodeURIComponent(cuenta)}/planes`)
}

export function enviarCrearPlan(
  cuenta: string,
  carrera: string,
): Promise<RespuestaServidor<RespuestaAccion>> {
  return enviar('/acciones/planes/crear', { cuenta, carrera })
}

export function enviarGuardarSeccion(
  cuenta: string,
  carrera: string,
  seccion: GuardarSeccionPlan,
): Promise<RespuestaServidor<RespuestaAccion>> {
  return enviar('/acciones/planes/guardar-seccion', { cuenta, carrera, ...seccion })
}

// F07b: los tres medidores (1 a 3, o nulo); lo enviado reemplaza.
export function enviarMedidores(
  cuenta: string,
  carrera: string,
  medidores: MedidoresEntrada,
): Promise<RespuestaServidor<RespuestaAccion>> {
  return enviar('/acciones/planes/medidores', { cuenta, carrera, ...medidores })
}

// F07b: marca un paso como hecho, con lo que averiguó (opcional).
export function enviarPasoHecho(
  cuenta: string,
  carrera: string,
  paso: number,
  hallazgo: string | null,
): Promise<RespuestaServidor<RespuestaAccion>> {
  return enviar('/acciones/planes/paso-hecho', { cuenta, carrera, paso, hallazgo })
}

// `carreras`: las de todos los planes, en el orden A, B, C.
export function enviarOrdenarPlanes(
  cuenta: string,
  carreras: string[],
): Promise<RespuestaServidor<RespuestaAccion>> {
  return enviar('/acciones/planes/ordenar', { cuenta, carreras })
}

export function enviarEliminarPlan(
  cuenta: string,
  carrera: string,
): Promise<RespuestaServidor<RespuestaAccion>> {
  return enviar('/acciones/planes/eliminar', { cuenta, carrera })
}
