import { configurarAcceso, enviar, obtener } from './cliente'
import type { IngresoEntrada, IngresoRespuesta, RespuestaServidor, SesionRespuesta } from '@/types/servidor'

export function ingresarSesion(entrada: IngresoEntrada): Promise<RespuestaServidor<IngresoRespuesta>> {
  return enviar('/sesion/ingresar', entrada)
}

export function consultarSesion(): Promise<RespuestaServidor<SesionRespuesta>> {
  return obtener('/sesion')
}

// main.tsx no importa cliente.ts: le entrega aquí cómo leer el token y qué hacer ante un 401.
export function configurarSesionApi(opciones: { obtenerToken: () => string | null; alVencer: () => void }) {
  configurarAcceso(opciones)
}
