import * as apiConversaciones from '@/services/api/conversaciones'
import type { RespuestaAccion, RespuestaServidor } from '@/types/servidor'
import { accionConRefresco, conDesbloqueos, vencerSiNoRefrescada } from './refresco'

// F08: la carta y las respuestas del estudiante. Refrescan el camino como completar (la carta habilita
// conversaciones; conversar abre una pregunta del diario) y vencen `conversaciones`, que la vista vuelve a pedir.
// Auditoría plataforma (F2b): sin desbloqueos no cambian el camino; con un CONVERSACION, el refresco ya venció la lista.
async function accionConversaciones(accion: Parameters<typeof accionConRefresco>[0]) {
  const respuesta = await accionConRefresco(accion, undefined, false, conDesbloqueos)
  if (respuesta.tipo === 'ok') vencerSiNoRefrescada('conversaciones', respuesta.datos)
  else if (respuesta.tipo === 'guardado_sin_refrescar') vencerSiNoRefrescada('conversaciones', undefined)
  return respuesta
}

export const guardarCarta = (texto: string) =>
  accionConversaciones((cuenta) => apiConversaciones.enviarCarta(cuenta, texto))

// La respuesta agrupada trae las dos cuentas; el estudiante refresca solo con la suya.
export const responderConversacion = (conversacion: string, texto: string) =>
  accionConversaciones(async (cuenta): Promise<RespuestaServidor<RespuestaAccion>> => {
    const respuesta = await apiConversaciones.enviarRespuestaConversacion(cuenta, conversacion, texto)
    return respuesta.tipo === 'ok' ? { tipo: 'ok', datos: respuesta.datos.por_cuenta[cuenta] } : respuesta
  })
