import type { NivelActual, RespuestaAccion } from './servidor'

// app/schemas/familia.py · GET /cuentas/{c}/familia (B12). F08: `codigo` del diploma (nulo sin diploma).
export type AvanceRuta = { completadas: number; total: number; porcentaje: number }
export type Diploma = { obtenido: boolean; obtenido_en: string | null; codigo: string | null }
export type EstudianteVinculado = {
  codigo: string
  nombre: string
  avance: AvanceRuta
  nivel_actual: NivelActual | null
}
export type FamiliaApoderado = {
  avance: AvanceRuta
  diploma: Diploma
  estudiante: EstudianteVinculado | null
}

// app/schemas/conversaciones.py · GET /cuentas/{c}/conversaciones (B12, F08). Todas las conversaciones, siempre;
// lo del otro y la guía, solo con las dos respuestas; la carta del otro, solo con `cartas_disponibles`.
export type EstadoConversacion =
  'bloqueada' | 'sin_responder' | 'esperando_al_otro' | 'te_toca' | 'conversada'
export type TramoConversacion = { numero: number; nombre: string }
export type EntradaDiarioConversacion = { codigo: string; nombre: string; pregunta: string }
export type ConversacionCuenta = {
  codigo: string
  orden: number
  tema: string
  tramo: TramoConversacion | null
  pregunta: string
  estado: EstadoConversacion
  bloqueo_mensaje: string | null
  // Solo el apoderado: si el hijo ya la tiene habilitada.
  abierta_para_hijo: boolean | null
  mi_respuesta: string | null
  conversada_en: string | null
  pregunta_otro: string | null
  respuesta_otro: string | null
  preguntas_guia: string[] | null
  mensaje_diferencias: string | null
  algo_que_saben: string | null
  // Solo el estudiante, conversada y con su pregunta del diario abierta.
  entrada_diario: EntradaDiarioConversacion | null
}
export type OtroVinculo = { codigo: string; nombre: string; parentesco: string | null }
export type ConversacionesCuenta = {
  carta_pendiente: boolean
  completadas: number
  total: number
  cartas_disponibles: boolean
  carta_propia: string | null
  carta_recibida: string | null
  otro: OtroVinculo
  conversaciones: ConversacionCuenta[]
}
// POST /acciones/responder-conversacion: con las dos respuestas, eventos en las dos cuentas.
export type RespuestaAgrupada = { por_cuenta: Record<string, RespuestaAccion> }
