import { enviar } from './cliente'
import type {
  RespuestaAccion,
  RespuestaCompletarActividad,
  RespuestaItemEntrada,
  RespuestaItemsGuardados,
  RespuestaReiniciarInstrumento,
  RespuestaResolverBatalla,
  RespuestaRevelarResultado,
  RespuestaResolverCaso,
  RespuestaServidor,
  ResolverBatallaEntrada,
  ResolverCasoEntrada,
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

export function revelarResultado(
  cuenta: string,
  instrumento: string,
  aplicacion: string,
): Promise<RespuestaServidor<RespuestaRevelarResultado>> {
  return enviar('/acciones/revelar-resultado', { cuenta, instrumento, aplicacion })
}

export function reiniciarInstrumento(
  cuenta: string,
  instrumento: string,
  aplicacion: string,
): Promise<RespuestaServidor<RespuestaReiniciarInstrumento>> {
  return enviar('/acciones/reiniciar-instrumento', { cuenta, instrumento, aplicacion })
}

export function resolverBatalla(
  entrada: ResolverBatallaEntrada,
): Promise<RespuestaServidor<RespuestaResolverBatalla>> {
  return enviar('/acciones/resolver-batalla', entrada)
}

export function resolverCaso(entrada: ResolverCasoEntrada): Promise<RespuestaServidor<RespuestaResolverCaso>> {
  return enviar('/acciones/resolver-caso', entrada)
}

export function verTestimonio(cuenta: string, testimonio: string): Promise<RespuestaServidor<RespuestaAccion>> {
  return enviar('/acciones/ver-testimonio', { cuenta, testimonio })
}
