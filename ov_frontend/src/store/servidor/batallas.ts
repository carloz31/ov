import * as apiBatallas from '@/services/api/batallas'
import * as apiAcciones from '@/services/api/acciones'
import { consultarCuenta, obtenerEstadoServidor, sesionServidor } from './sesion'
import { accionConRefresco } from './refresco'
import type { RespuestaBatallaEntrada, RespuestaResolverBatalla } from '@/types/servidor'

// Auditoría plataforma (F5): el drawer y el reproductor la piden al abrir la misma batalla. Se comparte mientras las
// actividades cargadas sean las mismas (lo que abre fichas o batallas llega con un refresco) y se olvida tras cada
// intento, que cambia intentos y estado. Un error no se guarda.
let lectura: {
  sesion: number
  actividades: unknown
  promesa: ReturnType<typeof pedirBatallas>
} | null = null
const pedirBatallas = () => consultarCuenta(apiBatallas.obtenerBatallas)
export function consultarBatallas() {
  const sesion = sesionServidor(),
    actividades = obtenerEstadoServidor().actividades.datos
  if (lectura?.sesion === sesion && lectura.actividades === actividades) return lectura.promesa
  const actual = { sesion, actividades, promesa: pedirBatallas() }
  lectura = actual
  void actual.promesa.then((r) => {
    if (r.tipo !== 'ok' && lectura === actual) lectura = null
  })
  return actual.promesa
}
// F04b: cada intento pide preguntas nuevas al servidor; nunca se guardan ni se comparten entre intentos.
export function consultarPreguntasBatalla(actividad: string) {
  return consultarCuenta((cuenta) => apiBatallas.obtenerPreguntasBatalla(cuenta, actividad))
}
// Cada intento se guarda con sus respuestas; el servidor decide la victoria y la devuelve con los aciertos
// y los destellos restantes. La primera victoria completa la batalla y trae sus desbloqueos.
export function resolverBatalla(
  actividad: string,
  respuestas: RespuestaBatallaEntrada[],
  confirmada?: RespuestaResolverBatalla,
) {
  // Ajuste notificaciones: CierreBatalla anuncia lo desbloqueado (sin toast).
  lectura = null
  return accionConRefresco(
    (cuenta) => apiAcciones.resolverBatalla({ cuenta, actividad, respuestas }),
    confirmada,
    true,
  )
}
