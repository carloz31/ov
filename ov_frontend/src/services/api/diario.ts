import { enviar, obtener } from './cliente'
import type {
  AmistadAsistente,
  CheckInsCuenta,
  EntradaDiarioPublica,
  PreguntaAbierta,
  PreguntaDelDia,
  PreguntaDiarioEstado,
  RespuestaAccion,
  RespuestaServidor,
} from '@/types/servidor'

const ruta = (cuenta: string, recurso: string) => `/cuentas/${encodeURIComponent(cuenta)}/${recurso}`

export function obtenerPreguntasDiario(cuenta: string): Promise<RespuestaServidor<PreguntaDiarioEstado[]>> {
  return obtener(ruta(cuenta, 'diario/preguntas'))
}

export function obtenerEntradasDiario(cuenta: string): Promise<RespuestaServidor<EntradaDiarioPublica[]>> {
  return obtener(ruta(cuenta, 'diario/entradas'))
}

export function obtenerAmistad(cuenta: string): Promise<RespuestaServidor<AmistadAsistente>> {
  return obtener(ruta(cuenta, 'diario/amistad'))
}

export function obtenerCheckIns(cuenta: string): Promise<RespuestaServidor<CheckInsCuenta>> {
  return obtener(ruta(cuenta, 'check-ins'))
}

// Sin `pregunta` ni `del_dia`, la entrada es libre.
export function enviarEntrada(entrada: {
  cuenta: string
  texto: string
  titulo?: string | null
  pregunta?: string
  del_dia?: boolean
}): Promise<RespuestaServidor<RespuestaAccion>> {
  return enviar('/acciones/escribir-entrada', entrada)
}

export function enviarEdicionEntrada(entrada: {
  cuenta: string
  numero: number
  texto: string
  titulo?: string | null
}): Promise<RespuestaServidor<RespuestaAccion>> {
  return enviar('/acciones/editar-entrada', entrada)
}

export function enviarBorradoEntrada(cuenta: string, numero: number): Promise<RespuestaServidor<RespuestaAccion>> {
  return enviar('/acciones/borrar-entrada', { cuenta, numero })
}

// Redacta la pregunta una sola vez (puede tardar si es personalizada) y devuelve su texto.
export function enviarAbrirPregunta(cuenta: string, codigo: string): Promise<RespuestaServidor<PreguntaAbierta>> {
  return enviar('/acciones/diario/abrir-pregunta', { cuenta, codigo })
}

// Devuelve la vigente o sortea una: es un POST aunque solo la lea.
export function enviarPreguntaDelDia(cuenta: string): Promise<RespuestaServidor<PreguntaDelDia>> {
  return enviar('/acciones/diario/pregunta-del-dia', { cuenta })
}

export function enviarCheckIn(cuenta: string, nivel_seguridad: number): Promise<RespuestaServidor<RespuestaAccion>> {
  return enviar('/acciones/check-in', { cuenta, nivel_seguridad })
}
