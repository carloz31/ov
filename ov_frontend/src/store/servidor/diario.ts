import * as apiDiario from '@/services/api/diario'
import type { RespuestaAccion } from '@/types/servidor'
import { consultarCuenta } from './sesion'
import { accionConRefresco, conDesbloqueos, vencerSiNoRefrescada } from './refresco'
import { asegurarSeccion, vencerSeccion } from './secciones'

// F05: diario y check-in del servidor. Las lecturas son secciones (`useDiario…Servidor`; `checkIns`, del refresco);
// cada acción vence lo que cambió para que las vistas montadas vuelvan a pedirlo.
function vencerDiario(datos?: RespuestaAccion) {
  vencerSeccion('diarioEntradas')
  // Auditoría plataforma (F2b): con un PREGUNTA_DIARIO, el refresco ya las venció y pidió.
  vencerSiNoRefrescada('diarioPreguntas', datos)
  vencerSeccion('amistad')
}

// Libre sin `pregunta` ni `delDia`. Escribir suma amistad y puede desbloquear insignias: con desbloqueos refresca
// como completar; sin ellos no cambia el camino (auditoría plataforma, F2b).
export async function escribirEntrada(entrada: {
  texto: string
  titulo?: string | null
  pregunta?: string
  delDia?: boolean
}) {
  const { delDia, ...resto } = entrada
  const respuesta = await accionConRefresco(
    (cuenta) => apiDiario.enviarEntrada({ cuenta, ...resto, ...(delDia ? { del_dia: true } : {}) }),
    undefined,
    false,
    conDesbloqueos,
  )
  if (respuesta.tipo === 'ok') vencerDiario(respuesta.datos)
  else if (respuesta.tipo === 'guardado_sin_refrescar') vencerDiario()
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

// Archivar y desarchivar no tocan entradas ni amistad: solo cambia la bandeja de la carta.
export async function archivarPregunta(codigo: string) {
  const respuesta = await consultarCuenta((cuenta) => apiDiario.enviarArchivarPregunta(cuenta, codigo))
  if (respuesta.tipo === 'ok') vencerSeccion('diarioPreguntas')
  return respuesta
}

export async function desarchivarPregunta(codigo: string) {
  const respuesta = await consultarCuenta((cuenta) => apiDiario.enviarDesarchivarPregunta(cuenta, codigo))
  if (respuesta.tipo === 'ok') vencerSeccion('diarioPreguntas')
  return respuesta
}

export function pedirPreguntaDelDia() {
  return consultarCuenta(apiDiario.enviarPreguntaDelDia)
}

export async function registrarCheckIn(nivel: number) {
  const respuesta = await accionConRefresco(
    (cuenta) => apiDiario.enviarCheckIn(cuenta, nivel),
    undefined,
    false,
    conDesbloqueos,
  )
  if (respuesta.tipo === 'ok' || respuesta.tipo === 'guardado_sin_refrescar') {
    // Nadie monta la sección: se vuelve a pedir aquí para que el panel y el aviso vean la señal de hoy.
    vencerSeccion('checkIns')
    await asegurarSeccion('checkIns')
  }
  return respuesta
}
