// Contratos de app/schemas/instrumentos.py de ov_backend (F03: separados de servidor.ts, que los reexporta).
export type DimensionPublica = { codigo: string; nombre: string; descripcion: string; orden: number }
export type ActividadPublica = { codigo: string; titulo: string; orden: number }
export type AplicacionPublica = {
  codigo: string
  nombre: string
  momento: 'UNICA' | 'ENTRADA' | 'SALIDA'
  actividades: ActividadPublica[]
}
// GET /instrumentos: catálogo con dimensiones, escalas y aplicaciones.
export type InstrumentoPublico = {
  codigo: string
  nombre: string
  descripcion: string
  tipo_resultado: 'COINCIDENCIAS' | 'DESTACADAS' | 'COMPARACION'
  dimensiones: DimensionPublica[]
  escalas: EscalaPublica[]
  aplicaciones: AplicacionPublica[]
}
export type OpcionPublica = { orden: number; etiqueta: string; puntaje: number }
export type EscalaPublica = { codigo: string; nombre: string; opciones: OpcionPublica[] }
export type ItemPublico = {
  codigo: string
  instrumento: string
  numero: number
  orden: number
  enunciado: string
  dimension: string | null
  inverso: boolean
  escala: EscalaPublica
}
export type RespuestaPublica = {
  item: string
  opcion: OpcionPublica
  creada_en: string
  actualizada_en: string
}
export type RespuestasActividad = { cuenta: string; actividad: string; respuestas: RespuestaPublica[] }
export type RespuestaItemEntrada = { item: string; opcion: number }
export type RespuestaItemsGuardados = {
  cuenta: string
  actividad: string
  respuestas_guardadas: RespuestaItemEntrada[]
  progreso: { estado: 'EN_CURSO' | 'COMPLETADA'; respondidos: number; total: number }
}
export type AvanceAplicacion = {
  aplicacion: string
  estado: 'NO_INICIADO' | 'EN_PROGRESO' | 'COMPLETADO'
  actividades: { completadas: number; total: number; faltantes: string[] }
  items: { respondidos: number; total: number }
  hay_resultado_vigente: boolean
}
export type AvanceInstrumento = { instrumento: string; aplicaciones: AvanceAplicacion[] }
export type DimensionResultado = {
  codigo: string
  nombre: string
  descripcion: string
  // En COMPARACION los números llegan en null (B07).
  puntaje: number | null
  puntaje_maximo: number | null
  porcentaje: number | null
  zona?: 'FUERTE' | 'EN_CAMINO' | 'POR_TRABAJAR' | null
  tematica?: string | null
}
export type CoincidenciaPublica = {
  posicion: number
  codigo: string | null
  codigo_onet: string
  titulo: string
  correlacion: number
  ajuste: 'BEST_FIT' | 'GREAT_FIT' | 'GOOD_FIT'
  es_favorita: boolean
}
export type CarreraRecomendada = {
  codigo: string
  nombre: string
  familia: string
  via: CoincidenciaPublica[]
  es_favorita: boolean
}
export type ResultadoPublico = {
  instrumento: string
  aplicacion: string
  calculado_en: string
  perfil_plano: boolean
  dimensiones: DimensionResultado[]
  dimensiones_destacadas?: DimensionResultado[] | null
  codigo_interes?: { codigo: string; hay_empate: boolean } | null
  coincidencias?: CoincidenciaPublica[] | null
  carreras_recomendadas?: CarreraRecomendada[] | null
}
export type ResultadoHistorico = ResultadoPublico & { anulado_en: string | null }
export type ZonaDimension = 'FUERTE' | 'EN_CAMINO' | 'POR_TRABAJAR'
export type ComparacionItem = { item: string; enunciado: string; partida: string; llegada: string; cambio: boolean }
export type ComparacionDimension = {
  codigo: string
  nombre: string
  descripcion: string
  tematica: string | null
  zona_partida: ZonaDimension
  zona_llegada: ZonaDimension
  actividades_completadas: number
  items: ComparacionItem[]
}
export type ComparacionAutopercepcion = {
  instrumento: string
  partida: string
  llegada: string
  dimensiones: ComparacionDimension[]
}
