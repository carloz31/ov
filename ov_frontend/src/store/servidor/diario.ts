import * as apiDiario from '@/services/api/diario'
import { consultarCuenta } from './sesion'
import { accionConRefresco } from './refresco'
import { vencerSeccion } from './secciones'

// F05: diario y check-in del servidor. Las lecturas son secciones (`useDiario…Servidor`, `useCheckInsServidor`);
// cada acción vence lo que cambió para que las vistas montadas vuelvan a pedirlo.
function vencerDiario() {
  vencerSeccion('diarioEntradas')
  vencerSeccion('diarioPreguntas')
  vencerSeccion('amistad')
}

// Libre sin `pregunta` ni `delDia`. Escribir suma amistad y puede desbloquear insignias: refresca como completar.
export async function escribirEntrada(entrada: {
  texto: string
  titulo?: string | null
  pregunta?: string
  delDia?: boolean
}) {
  const { delDia, ...resto } = entrada
  const respuesta = await accionConRefresco((cuenta) =>
    apiDiario.enviarEntrada({ cuenta, ...resto, ...(delDia ? { del_dia: true } : {}) }),
  )
  if (respuesta.tipo === 'ok' || respuesta.tipo === 'guardado_sin_refrescar') vencerDiario()
  return respuesta
}

export async function editarEntrada(numero: number, texto: string, titulo?: string | null) {
  const respuesta = await consultarCuenta((cuenta) =>
    apiDiario.enviarEdicionEntrada({ cuenta, numero, texto, ...(titulo !== undefined ? { titulo } : {}) }),
  )
  if (respuesta.tipo === 'ok') vencerSeccion('diarioEntradas')
  return respuesta
}

// Borrar no baja la amistad, pero la pregunta que respondía vuelve a quedar sin responder.
export async function borrarEntrada(numero: number) {
  const respuesta = await consultarCuenta((cuenta) => apiDiario.enviarBorradoEntrada(cuenta, numero))
  if (respuesta.tipo === 'ok') {
    vencerSeccion('diarioEntradas')
    vencerSeccion('diarioPreguntas')
  }
  return respuesta
}

export async function abrirPregunta(codigo: string) {
  const respuesta = await consultarCuenta((cuenta) => apiDiario.enviarAbrirPregunta(cuenta, codigo))
  if (respuesta.tipo === 'ok') vencerSeccion('diarioPreguntas')
  return respuesta
}

export function pedirPreguntaDelDia() {
  return consultarCuenta(apiDiario.enviarPreguntaDelDia)
}

export async function registrarCheckIn(nivel: number) {
  const respuesta = await accionConRefresco((cuenta) => apiDiario.enviarCheckIn(cuenta, nivel))
  if (respuesta.tipo === 'ok' || respuesta.tipo === 'guardado_sin_refrescar') vencerSeccion('checkIns')
  return respuesta
}
