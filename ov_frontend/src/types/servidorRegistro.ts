// Contrato con el backend: app/schemas/registro.py. Lo reexporta servidor.ts.
import type { RespuestaAccion } from './servidor'

// app/schemas/registro.py (B02–B04; F01)
export type EstadoRespuestaRegistro = 'BORRADOR' | 'PENDIENTE_SEGUIMIENTO' | 'FINAL'
export type OpcionElegida = { codigo: string; texto?: string | null }
export type BorradorRegistroEntrada = {
  cuenta: string
  actividad: string
  item: string
  texto: string
  opciones: OpcionElegida[]
  posicion?: string | null
}
export type OpcionListaPublica = { codigo: string; texto: string }
// Ajuste registros: fuente de opciones, opciones propias (sin criterio ni ejemplos) y premarcado.
export type FuenteOpciones = 'LISTA' | 'REFERENCIA' | 'PROPIAS'
export type OpcionPropiaPublica = {
  codigo: string
  texto: string
  exclusiva: boolean
  pregunta_propia: string | null
  sin_seguimiento: boolean
}
export type PremarcarPublico = { item: string; opcion: string; marca: string }
export type EleccionPublica = {
  fuente: FuenteOpciones
  lista: string | null
  referencia: string | null
  referencia_opciones: string | null
  comun: boolean
  minima: number
  maxima: number
  ordenada: boolean
  permite_otra: boolean
  opciones: OpcionListaPublica[]
  opciones_propias: OpcionPropiaPublica[]
  premarcar_si: PremarcarPublico | null
}
export type ItemRegistroPublico = {
  codigo: string
  nombre: string
  consigna: string
  min_caracteres: number | null
  obligatorio: boolean
  eleccion: EleccionPublica | null
}
export type EstadoItemRegistro = { item: string; estado: EstadoRespuestaRegistro }
export type MensajeRespuestaRegistro = {
  tipo: 'respuesta'
  texto: string
  orden?: number | null
  borrador?: boolean | null
}
export type MensajePreguntaRegistro = { tipo: 'pregunta'; orden: number; texto: string }
// Ajuste registros: el texto fijo de Lumi ante una respuesta sensible (solo «Continuar»).
export type MensajeAvisoRegistro = { tipo: 'aviso'; texto: string }
export type MensajeRegistro = MensajeRespuestaRegistro | MensajePreguntaRegistro | MensajeAvisoRegistro
export type RespuestaRegistroPublica = EstadoItemRegistro & {
  opciones_elegidas: OpcionElegida[]
  conversacion: MensajeRegistro[]
  texto_consolidado?: string | null
}
export type ItemPorAmpliar = { item: string; pista: string; falta?: string | null }
export type RegistroConsultado = {
  posicion: string | null
  estado: 'EN_CURSO' | 'COMPLETADA' | null
  respuestas: RespuestaRegistroPublica[]
  items_por_ampliar?: ItemPorAmpliar[] | null
  items_abiertos?: string[] | null
}
export type RespuestaRegistroAccion = RegistroConsultado & RespuestaAccion
export type ItemEdicion = { item: string; texto: string; opciones?: OpcionElegida[] | null }
