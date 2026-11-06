// Contratos de app/schemas/instrumentos.py de ov_backend (F03: separados de servidor.ts, que los reexporta).
import type { FamiliaPublica, TipoInstitucionServidor } from './servidorCatalogo'

// Ajuste carga-instrumentos: cuatro piezas por dimensión (descripción, ejemplos, fortalezas y desarrollo).
export type TextosDimension = { ejemplos: string | null; fortalezas: string[]; desarrollo: string[] }
export type DimensionPublica = { codigo: string; nombre: string; descripcion: string; orden: number } & TextosDimension
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
  // Ajuste resultados-intereses: cómo leer el resultado y la línea de encuadre, del estudiante.
  lectura: string
  mensaje: string
  guia_abierta: boolean
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
export type RespuestaItemEntrada = { item: string; opcion: number; tiempo_ms?: number | null }
export type RespuestaItemsGuardados = {
  cuenta: string
  actividad: string
  respuestas_guardadas: { item: string; opcion: number }[]
  progreso: { estado: 'EN_CURSO' | 'COMPLETADA'; respondidos: number; total: number }
  aviso_velocidad?: number | null
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
  // En COMPARACION los números llegan en null (B07). `puntaje_visual` es el 0–100 entero que se muestra.
  puntaje: number | null
  puntaje_maximo: number | null
  puntaje_visual: number | null
  zona?: 'FUERTE' | 'EN_CAMINO' | 'POR_TRABAJAR' | null
  tematica?: string | null
} & TextosDimension
// Ajuste resultados-intereses: la banda y el parecido (r × 100) los calcula el backend; el r crudo no llega.
export type BandaAfinidad = 'MUY_AFIN' | 'AFIN' | 'CERCANA'
export type PreparacionOcupacion = 'AMPLIA' | 'INTERMEDIA'
export type OcupacionAfinPublica = {
  posicion: number
  codigo: string
  codigo_onet: string
  titulo: string
  resumen: string | null
  riasec: string[]
  parecido: number
  banda: BandaAfinidad
  // AMPLIA (job_zone 4–5) o INTERMEDIA (2–3); nula sin job_zone (solo aparece en «Todas»).
  preparacion: PreparacionOcupacion | null
  familia_principal: FamiliaPublica | null
}
// Ocupaciones mostradas por el área (campo específico) de su familia principal; «Sin familia» con código nulo.
export type AreaOcupaciones = { area_codigo: string | null; area_nombre: string; ocupaciones: string[] }
export type OcupacionDeFamiliaRecomendada = { codigo: string; titulo: string; parecido: number }
// En orden de recomendación; la afinidad de la familia no se expone.
export type FamiliaRecomendadaPublica = {
  posicion: number
  codigo: string
  nombre: string
  area_codigo: string
  area_nombre: string
  descripcion: string | null
  tipos: TipoInstitucionServidor[]
  total_carreras: number
  total_ocupaciones: number
  ocupaciones: OcupacionDeFamiliaRecomendada[]
  unica_ocupacion: boolean
}
// `mensaje` y `lectura` son los de quien consulta (estudiante o apoderado, con el nombre del hijo ya puesto).
export type ResultadoPublico = {
  instrumento: string
  aplicacion: string
  calculado_en: string
  perfil_plano: boolean
  mensaje: string
  lectura: string
  guia_abierta: boolean
  dimensiones: DimensionResultado[]
  dimensiones_destacadas?: DimensionResultado[] | null
  codigo_interes?: { codigo: string; hay_empate: boolean } | null
  perfil_poco_marcado?: boolean | null
  ocupaciones?: OcupacionAfinPublica[] | null
  por_area?: AreaOcupaciones[] | null
  familias?: FamiliaRecomendadaPublica[] | null
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
  lectura: string
  mensaje: string
  partida: string
  llegada: string
  dimensiones: ComparacionDimension[]
}
