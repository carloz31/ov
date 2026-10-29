import * as apiCatalogo from '@/services/api/catalogo'
import * as apiFavoritos from '@/services/api/favoritos'
import * as apiInvestigaciones from '@/services/api/investigaciones'
import type {
  FichaEntrevistaEntrada,
  MotivoReporte,
  PreguntaGuionEntrada,
  RespuestaAccion,
  RespuestaAgrupada,
  RespuestaServidor,
} from '@/types/servidor'
import { accionConRefresco } from './refresco'
import { vencerSeccion } from './secciones'
import { consultarCuenta, consultarCuentaSesion } from './sesion'
import { actualizarEntrevista, vencerEntrevistas } from './entrevistas'

// F09: las acciones de Investigaciones. Las que dan eventos (iniciar, terminar el guion, publicar, reaccionar)
// refrescan el camino como completar (insignias, la misión «Lo que cambió»); todas vencen lo que cambian: la
// sección `investigaciones` (en curso, aliados, conteos) y las listas y detalles de entrevistas.
type Resultado<T> = Awaited<ReturnType<typeof accionConRefresco<T & RespuestaAccion>>>
const confirmada = (r: { tipo: string }) => r.tipo === 'ok' || r.tipo === 'guardado_sin_refrescar'

async function accionInvestigacion<T extends RespuestaAccion>(
  accion: (cuenta: string) => Promise<RespuestaServidor<T>>,
  entrevistas = false,
): Promise<Resultado<T>> {
  const respuesta = await accionConRefresco(accion)
  if (confirmada(respuesta)) {
    vencerSeccion('investigaciones')
    if (entrevistas) vencerEntrevistas()
  }
  return respuesta
}
// Publicar y editar responden por cuenta (los coautores); el estudiante refresca con la suya.
const propia =
  (accion: (cuenta: string) => Promise<RespuestaServidor<RespuestaAgrupada>>) =>
  async (cuenta: string): Promise<RespuestaServidor<RespuestaAccion>> => {
    const respuesta = await accion(cuenta)
    return respuesta.tipo === 'ok' ? { tipo: 'ok', datos: respuesta.datos.por_cuenta[cuenta] } : respuesta
  }

// Paso 1: el buscador de ocupación (hasta 8, del catálogo). Una búsqueda nueva cancela la anterior con `senal`.
export const MAXIMO_OCUPACIONES_BUSCADOR = 8
export const buscarOcupaciones = (texto: string, senal: AbortSignal) =>
  consultarCuenta((cuenta) =>
    apiCatalogo.buscarCatalogo(cuenta, 'ocupaciones', { buscar: texto }, MAXIMO_OCUPACIONES_BUSCADOR, 0, senal),
  )
// «Investigarla» desde el detalle de una ocupación: su título.
export const consultarOcupacionInvestigar = (codigo: string) =>
  consultarCuenta((cuenta) => apiCatalogo.obtenerOcupacion(cuenta, codigo))

export const guardarLoQuePienso = (ocupacion: string, dia: string, necesita: string, duda: string) =>
  accionInvestigacion((cuenta) => apiInvestigaciones.guardarLoQuePienso(cuenta, ocupacion, dia, necesita, duda))

// Una lectura con efecto: las sugerencias quedan guardadas y `sugerencias_vigentes` pasa a verdadero.
export async function pedirSugerenciasGuion() {
  const respuesta = await consultarCuenta(apiInvestigaciones.pedirSugerenciasGuion)
  if (respuesta.tipo === 'ok' && respuesta.datos.estado !== 'ERROR') vencerSeccion('investigaciones')
  return respuesta
}

export const guardarGuion = (preguntas: PreguntaGuionEntrada[], descartadas: string[], terminar: boolean) =>
  accionInvestigacion((cuenta) => apiInvestigaciones.guardarGuion(cuenta, preguntas, descartadas, terminar))

export const cancelarInvestigacion = () => accionInvestigacion(apiInvestigaciones.cancelarInvestigacion, true)

export const publicarEntrevista = (ficha: FichaEntrevistaEntrada, coautores: string[], permiso: boolean) =>
  accionInvestigacion(
    propia((cuenta) => apiInvestigaciones.publicarEntrevista(cuenta, ficha, coautores, permiso)),
    true,
  )

export const editarEntrevista = (entrevista: string, ficha: FichaEntrevistaEntrada, coautoresNuevos: string[]) =>
  accionInvestigacion(
    propia((cuenta) => apiInvestigaciones.editarEntrevista(cuenta, entrevista, ficha, coautoresNuevos)),
    true,
  )

export const retirarEntrevista = (entrevista: string) =>
  accionInvestigacion((cuenta) => apiInvestigaciones.retirarEntrevista(cuenta, entrevista), true)

// Abrir el detalle registra la vista la primera vez; quien la llama no espera la respuesta.
export async function verEntrevista(entrevista: string) {
  const respuesta = await consultarCuenta((cuenta) => apiInvestigaciones.verEntrevista(cuenta, entrevista))
  if (respuesta.tipo === 'ok') actualizarEntrevista(entrevista, () => ({ vista: true }))
  return respuesta
}

// El favorito confirmado se aplica a lo cargado (la estrella y el conteo); la Leyenda la decide el servidor, así
// que también se vence la sección.
export async function alternarFavoritoEntrevista(entrevista: string, marcar: boolean) {
  const respuesta = await consultarCuenta((cuenta) =>
    (marcar ? apiFavoritos.marcarFavorito : apiFavoritos.desmarcarFavorito)(cuenta, 'ENTREVISTA', entrevista),
  )
  if (respuesta.tipo === 'ok') {
    actualizarEntrevista(entrevista, (t) => ({
      favorita: marcar,
      favoritos: Math.max(0, t.favoritos + (marcar === t.favorita ? 0 : marcar ? 1 : -1)),
    }))
    vencerSeccion('investigaciones')
  }
  return respuesta
}

export const reaccionarEntrevista = (entrevista: string, tipo: string, comentario: string | null) =>
  accionInvestigacion(
    (cuenta) => apiInvestigaciones.reaccionarEntrevista(cuenta, entrevista, tipo, comentario),
    true,
  )

async function accionEntrevistas(accion: (cuenta: string) => Promise<RespuestaServidor<RespuestaAccion>>) {
  const respuesta = await consultarCuentaSesion(accion)
  if (respuesta.tipo === 'ok') vencerEntrevistas()
  return respuesta
}
// También la orientadora (con la cuenta de la sesión).
export const eliminarReaccion = (reaccion: string) =>
  accionEntrevistas((cuenta) => apiInvestigaciones.eliminarReaccion(cuenta, reaccion))

export const reportarContenido = (
  contenido: { entrevista: string } | { reaccion: string },
  motivo: MotivoReporte,
  detalle: string | null,
) => accionEntrevistas((cuenta) => apiInvestigaciones.reportar(cuenta, contenido, motivo, detalle))

// --- Orientadora ---
export const destacarEntrevista = (entrevista: string, destacada: boolean) =>
  accionEntrevistas((cuenta) => apiInvestigaciones.destacarEntrevista(cuenta, entrevista, destacada))
export const comentarEntrevista = (entrevista: string, texto: string, reaccion?: string | null) =>
  accionEntrevistas((cuenta) => apiInvestigaciones.comentarEntrevista(cuenta, entrevista, texto, reaccion))
export const eliminarEntrevista = (entrevista: string) =>
  accionEntrevistas((cuenta) => apiInvestigaciones.eliminarEntrevista(cuenta, entrevista))
export const descartarReporte = (reporte: string) =>
  accionEntrevistas((cuenta) => apiInvestigaciones.descartarReporte(cuenta, reporte))
