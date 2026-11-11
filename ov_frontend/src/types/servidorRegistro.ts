// Contrato con el backend: app/schemas/registro.py. Lo reexporta servidor.ts.
// Ajuste front de registros (lote 1): el flujo ítem por ítem del ajuste registros llm (lote 3).
import type { RespuestaAccion } from './servidor'

export type OpcionElegida = { codigo: string; texto?: string | null }

// Entradas de las acciones: `item` y, al responder o editar, la elección y el texto.
export type ResponderItemEntrada = {
  cuenta: string
  actividad: string
  item: string
  opciones: OpcionElegida[]
  texto: string
}
export type ResponderSeguimientoEntrada = { cuenta: string; actividad: string; item: string; texto: string }

// La lectura del registro (§7 del lote 3).
export type OpcionGuardada = { codigo: string; texto: string }
export type ConsignaItem = {
  dialogo: string | null
  pregunta_eleccion: string | null
  pregunta_texto: string
  arranque: string | null
}
export type EleccionItem = {
  minima: number
  maxima: number
  ordenada: boolean
  permite_otra: boolean
  etiqueta_otra: string | null
}
export type OpcionOfrecida = {
  codigo: string
  texto: string
  origen: string | null
  grupo: string | null
  exclusiva: boolean
  sin_llm: boolean
  pregunta: string | null
  arranque: string | null
  // Una pieza que cita un texto: sus líneas por separado (`texto` las une con « / »).
  lineas?: string[]
}
// Los ecos que se muestran: estructurados, con forma propia según el eco (`list[dict]` en el backend).
export type EcoMostrado = { codigo?: string; nombre?: string | null; forma?: string | null; [clave: string]: unknown }
export type RespuestaVigente = {
  opciones_elegidas: OpcionGuardada[]
  primera_respuesta: string
  linea_seguimiento: string | null
  pista: string | null
  reenviable: boolean
  eco_cambiado: boolean
}
export type ItemRegistroCuenta = {
  codigo: string
  nombre: string
  obligatorio: boolean
  con_llm: boolean
  disponible: boolean
  marcador_faltante: string | null
  consigna: ConsignaItem | null
  eleccion: EleccionItem | null
  opciones: OpcionOfrecida[]
  ecos: EcoMostrado[]
  respuesta: RespuestaVigente | null
}
export type EstadoRegistro = 'EN_CURSO' | 'COMPLETADA'
export type RegistroConsultado = {
  estado: EstadoRegistro | null
  item_actual: string | null
  items: ItemRegistroCuenta[]
}
export type RespuestaRegistroAccion = RegistroConsultado & RespuestaAccion
export type TipoPasoRegistro = 'SIGUIENTE' | 'REPREGUNTA' | 'MENSAJE'
export type PasoRegistro = RespuestaAccion & {
  item: string
  paso: TipoPasoRegistro
  repregunta: string | null
  mensaje: string | null
  registro: RegistroConsultado
}
