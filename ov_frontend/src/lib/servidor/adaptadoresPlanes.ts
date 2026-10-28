import type {
  CodigoSeccionPlan,
  ConocimientoDatos,
  DudaEntrada,
  DudaPublica,
  ElegidaEntrada,
  EstadoSeccionPlan,
  OpcionesTarjeta,
  OrigenDuda,
  OrigenIdea,
  PlanCarrera,
  PorQueDatos,
  PreguntaConocimiento,
  RespuestaConocimiento,
  ResultadoPublico,
  SeccionPlan,
} from '@/types/servidor'

// F07a: la tarjeta v4 a partir de GET /planes. Los textos de pantalla son del front (F07b-pantallas §0); los de las
// listas, preguntas, dudas y bloqueos llegan del servidor y se muestran tal cual. Solo importa tipos.

export const TITULOS_SECCION: Record<CodigoSeccionPlan, string> = {
  POR_QUE: 'Por qué la elijo',
  CONOCIMIENTO: 'Qué tanto la conozco',
  REALIDAD: 'Cómo lo haría realidad',
  PASOS: 'Mis próximos pasos',
}
export const NUMERO_SECCION: Record<CodigoSeccionPlan, number> = { POR_QUE: 1, CONOCIMIENTO: 2, REALIDAD: 3, PASOS: 4 }
export const ESTADOS_SECCION: Record<EstadoSeccionPlan, string> = {
  BLOQUEADA: 'Bloqueada',
  POR_EMPEZAR: 'Por empezar',
  EN_PROCESO: 'En proceso',
  LISTA: 'Lista',
}
export const IDEAS_ORIGEN: [OrigenIdea, string][] = [
  ['MIA', 'Mía'],
  ['FAMILIA', 'De mi familia'],
  ['CONOCIDO', 'De alguien que conozco'],
  ['TEST', 'De un test'],
  ['PLATAFORMA', 'De la plataforma'],
]
export const RESPUESTAS_CONOCIMIENTO: [RespuestaConocimiento, string][] = [
  ['SI', 'Sí'],
  ['MAS_O_MENOS', 'Más o menos'],
  ['NO', 'No'],
]
export const ORIGENES_DUDA: Record<OrigenDuda, string> = {
  PREGUNTA: 'De tu respuesta',
  SUGERIDA: 'Sugerida',
  PROPIA: 'Duda tuya',
}

export const textoIdea = (idea: OrigenIdea | null) => IDEAS_ORIGEN.find(([c]) => c === idea)?.[1] ?? null
export const textoRespuesta = (r: RespuestaConocimiento | null | undefined) =>
  RESPUESTAS_CONOCIMIENTO.find(([c]) => c === r)?.[1] ?? null
export const conCarrera = (texto: string, carrera: string) => texto.replaceAll('{carrera}', carrera)

export function textoMotivo(motivo: { opcion: string | null; otro: string | null }, opciones: OpcionesTarjeta) {
  return motivo.otro ?? opciones.valores.find((v) => v.codigo === motivo.opcion)?.texto ?? motivo.opcion ?? ''
}

// La primera línea del relato, recortada para las tarjetas y el menú.
export function inicioRelato(relato: string | null, largo = 60) {
  const linea = relato?.trim().split('\n')[0] ?? ''
  return linea.length > largo ? `${linea.slice(0, largo).trimEnd()}…` : linea
}

export const seccionesListas = (plan: PlanCarrera) => plan.secciones.filter((s) => s.estado === 'LISTA').length
export const mensajeBloqueo = (seccion: SeccionPlan) => seccion.bloqueo?.[0]?.mensaje ?? ''

// La sección que abre el botón de la tarjeta: la primera abierta que no esté lista, o la 1 si todas lo están.
export function seccionSiguiente(plan: PlanCarrera): CodigoSeccionPlan {
  return plan.secciones.find((s) => s.estado === 'POR_EMPEZAR' || s.estado === 'EN_PROCESO')?.codigo ?? 'POR_QUE'
}
export function textoBotonPlan(plan: PlanCarrera) {
  const siguiente = plan.secciones.find((s) => s.estado === 'POR_EMPEZAR' || s.estado === 'EN_PROCESO')
  if (!siguiente) return 'Ver mi plan'
  if (siguiente.codigo === 'POR_QUE' && siguiente.estado === 'POR_EMPEZAR')
    return `Empezar: ${TITULOS_SECCION.POR_QUE}`
  return `Seguir con: ${TITULOS_SECCION[siguiente.codigo]}`
}

const contarDudas = (dudas: DudaPublica[]) => ({
  abiertas: dudas.filter((d) => d.estado === 'ABIERTA').length,
  resueltas: dudas.filter((d) => d.estado === 'CERRADA').length,
})
export const resumenDudas = (dudas: DudaPublica[]) => {
  const { abiertas, resueltas } = contarDudas(dudas)
  return `${abiertas} ${abiertas === 1 ? 'abierta' : 'abiertas'} · ${resueltas} ${resueltas === 1 ? 'resuelta' : 'resueltas'}`
}

// La línea de cada entrada del menú del plan (F07b-pantallas §4).
export function resumenSeccion(plan: PlanCarrera, seccion: SeccionPlan, opciones: OpcionesTarjeta) {
  if (seccion.estado === 'BLOQUEADA') return mensajeBloqueo(seccion)
  if (seccion.estado === 'POR_EMPEZAR') return 'Todavía nada'
  if (seccion.codigo === 'POR_QUE') {
    const relato = inicioRelato(plan.relato, 24)
    return [textoIdea(plan.idea_origen), plan.motivos[0] && textoMotivo(plan.motivos[0], opciones), relato && `«${relato}»`]
      .filter(Boolean)
      .join(' · ')
  }
  if (seccion.codigo === 'CONOCIMIENTO') {
    const respondidas = Object.values(plan.conocimiento).filter(Boolean).length
    const { abiertas, resueltas } = contarDudas(plan.dudas)
    return `${respondidas} de 5 respondidas · ${abiertas} ${abiertas === 1 ? 'duda abierta' : 'dudas abiertas'} · ${resueltas} ${resueltas === 1 ? 'resuelta' : 'resueltas'}`
  }
  return ESTADOS_SECCION[seccion.estado]
}

// «Último cambio: 25 oct» (fecha corta, sin texto relativo).
export function fechaCorta(iso: string) {
  const fecha = new Date(iso)
  if (Number.isNaN(fecha.getTime())) return iso
  return fecha.toLocaleDateString('es-PE', { day: 'numeric', month: 'short' }).replace('.', '')
}

// «Cómo encaja contigo» (POR_QUE): solo con resultado RIASEC revelado, no plano, y carrera con tipo.
export function encajeRiasec(
  riasecCarrera: string[],
  resultado: ResultadoPublico | null,
  nombres: Record<string, string>,
) {
  const codigo = resultado && !resultado.perfil_plano ? resultado.codigo_interes?.codigo : null
  if (!codigo || codigo.length < 2 || !riasecCarrera.length) return null
  const nombre = (letra: string) => nombres[letra.toUpperCase()] ?? letra
  return { carrera: nombre(riasecCarrera[0]), principal: nombre(codigo[0]), segundo: nombre(codigo[1]) }
}

// --- Borradores de edición y cuerpos de guardar-seccion --------------------------------------------

export type MotivoBorrador = { opcion: string } | { otro: string }
export type BorradorPorQue = { idea: OrigenIdea | null; motivos: MotivoBorrador[]; relato: string }
export function borradorPorQue(plan: PlanCarrera): BorradorPorQue {
  return {
    idea: plan.idea_origen,
    motivos: plan.motivos.map((m) => (m.otro !== null ? { otro: m.otro } : { opcion: m.opcion! })),
    relato: plan.relato ?? '',
  }
}
export function datosPorQue(b: BorradorPorQue): PorQueDatos {
  const motivos: ElegidaEntrada[] = b.motivos.filter((m) => !('otro' in m) || m.otro.trim())
  return { idea_origen: b.idea, motivos, relato: b.relato.trim() || null }
}

// Las dudas sugeridas y propias que se conservan (`numero`) o se crean; las de pregunta las maneja el servidor.
export type DudaBorrador =
  | { numero: number; origen: 'SUGERIDA' | 'PROPIA'; texto: string }
  | { origen: 'SUGERIDA'; opcion: string; texto: string }
  | { origen: 'PROPIA'; texto: string; clave: number }
export type BorradorConocimiento = {
  respuestas: Partial<Record<PreguntaConocimiento, RespuestaConocimiento>>
  dudas: DudaBorrador[]
}
export function borradorConocimiento(plan: PlanCarrera): BorradorConocimiento {
  const respuestas: BorradorConocimiento['respuestas'] = {}
  for (const [pregunta, respuesta] of Object.entries(plan.conocimiento))
    if (respuesta) respuestas[pregunta as PreguntaConocimiento] = respuesta
  const dudas = plan.dudas
    .filter((d) => d.origen !== 'PREGUNTA')
    .map((d) => ({ numero: d.numero, origen: d.origen as 'SUGERIDA' | 'PROPIA', texto: d.texto }))
  return { respuestas, dudas }
}
export function datosConocimiento(b: BorradorConocimiento): ConocimientoDatos {
  const dudas: DudaEntrada[] = b.dudas.flatMap((d): DudaEntrada[] => {
    if ('numero' in d) return [{ numero: d.numero }]
    if (d.origen === 'SUGERIDA') return [{ origen: 'SUGERIDA', opcion: d.opcion }]
    return d.texto.trim() ? [{ origen: 'PROPIA', texto: d.texto.trim() }] : []
  })
  return { respuestas: b.respuestas, dudas }
}

// Vista previa en edición: lo que el servidor hará con las dudas de pregunta al guardar.
export type DudaPrevia = {
  pregunta: PreguntaConocimiento
  texto: string
  respuesta: RespuestaConocimiento
  efecto: 'crear' | 'existe' | 'resolver'
  existente: DudaPublica | null
}
export function dudasDePregunta(plan: PlanCarrera, b: BorradorConocimiento, opciones: OpcionesTarjeta): DudaPrevia[] {
  return opciones.preguntas.flatMap((p): DudaPrevia[] => {
    const respuesta = b.respuestas[p.codigo],
      existente = plan.dudas.find((d) => d.origen === 'PREGUNTA' && d.pregunta === p.codigo) ?? null
    if (!respuesta) return []
    const texto = existente?.texto ?? conCarrera(p.texto_duda, plan.carrera.nombre)
    if (respuesta === 'SI')
      return existente?.estado === 'ABIERTA' ? [{ pregunta: p.codigo, texto, respuesta, efecto: 'resolver', existente }] : []
    const efecto = existente?.estado === 'ABIERTA' ? 'existe' : 'crear'
    return [{ pregunta: p.codigo, texto, respuesta, efecto, existente }]
  })
}

// Lectura: «Sí · averiguado» si la duda de esa pregunta se cerró con un hallazgo.
export function respuestaLeida(plan: PlanCarrera, pregunta: PreguntaConocimiento) {
  const duda = plan.dudas.find((d) => d.origen === 'PREGUNTA' && d.pregunta === pregunta)
  if (duda?.estado === 'CERRADA' && duda.hallazgo) return 'Sí · averiguado'
  return textoRespuesta(plan.conocimiento[pregunta])
}

// Repregunta fija de POR_QUE: guardada, con las tres respuestas, y aun así en proceso (relato corto).
export function pideMasRelato(plan: PlanCarrera) {
  const porQue = plan.secciones.find((s) => s.codigo === 'POR_QUE')
  return porQue?.estado === 'EN_PROCESO' && !!plan.idea_origen && plan.motivos.length > 0 && !!plan.relato
}
