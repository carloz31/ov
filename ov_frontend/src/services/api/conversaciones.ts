import { enviar, obtener } from './cliente'
import type {
  ConversacionesCuenta,
  RespuestaAccion,
  RespuestaAgrupada,
  RespuestaServidor,
} from '@/types/servidor'

// Conversaciones en familia y cartas (B12, F08). `estudiante`: solo el apoderado, el hijo del vínculo.
export function obtenerConversaciones(
  cuenta: string,
  estudiante?: string | null,
): Promise<RespuestaServidor<ConversacionesCuenta>> {
  const consulta = estudiante ? `?estudiante=${encodeURIComponent(estudiante)}` : ''
  return obtener(`/cuentas/${encodeURIComponent(cuenta)}/conversaciones${consulta}`)
}

export function enviarCarta(
  cuenta: string,
  texto: string,
  estudiante?: string | null,
): Promise<RespuestaServidor<RespuestaAccion>> {
  return enviar('/acciones/escribir-carta', { cuenta, texto, ...(estudiante ? { estudiante } : {}) })
}

export function enviarRespuestaConversacion(
  cuenta: string,
  conversacion: string,
  texto: string,
  estudiante?: string | null,
): Promise<RespuestaServidor<RespuestaAgrupada>> {
  return enviar('/acciones/responder-conversacion', {
    cuenta,
    conversacion,
    texto,
    ...(estudiante ? { estudiante } : {}),
  })
}
