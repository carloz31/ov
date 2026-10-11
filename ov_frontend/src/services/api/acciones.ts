import { enviar } from './cliente'
import type {
  RespuestaAccion,
  RespuestaCompletarActividad,
  RespuestaItemEntrada,
  RespuestaItemsGuardados,
  RespuestaServidor,
} from '@/types/servidor'

export function ingresar(cuenta: string): Promise<RespuestaServidor<RespuestaAccion>> {
  return enviar('/acciones/ingresar', { cuenta })
}

export function completarActividad(
  cuenta: string,
  actividad: string,
): Promise<RespuestaServidor<RespuestaCompletarActividad>> {
  return enviar('/acciones/completar-actividad', { cuenta, actividad })
}

export function responderItems(
  cuenta: string,
  actividad: string,
  respuestas: RespuestaItemEntrada[],
): Promise<RespuestaServidor<RespuestaItemsGuardados>> {
  return enviar('/acciones/responder-items', { cuenta, actividad, respuestas })
}
