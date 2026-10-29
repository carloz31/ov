// app/schemas/investigaciones.py (B13; F09): investigación, guion, entrevistas, reacciones y la tabla de la orientadora.
export type EstadoInvestigacion = 'EN_CURSO' | 'GUIA_LISTA' | 'PUBLICADA'
export type OrigenPreguntaGuion = 'DUDA' | 'SUGERIDA' | 'PROPIA'
export type MotivoReporte = 'OFENSIVO' | 'VIDEO' | 'DATOS_PRIVADOS' | 'OTRO'
export type OcupacionBreve = { codigo: string; titulo: string }
export type NivelBreve = { numero: number; titulo: string }
// `nivel` nulo si la cuenta está inactiva; `vitrina`: códigos de insignia.
export type PersonaInvestigacion = {
  codigo: string
  nombre: string
  nivel: NivelBreve | null
  vitrina: string[]
}
export type LoQuePienso = { dia: string; necesita: string; duda: string }
export type PreguntaGuionPublica = { origen: OrigenPreguntaGuion; texto: string }
export type SugerenciaGuionPublica = { codigo: string; texto: string }
export type InvestigacionEnCurso = {
  codigo: string
  estado: EstadoInvestigacion
  ocupacion: OcupacionBreve
  lo_que_pienso: LoQuePienso
  preguntas: PreguntaGuionPublica[]
  sugerencias: SugerenciaGuionPublica[]
  sugerencias_vigentes: boolean
  creada_en: string
  guia_lista_en: string | null
}
export type Aliado = PersonaInvestigacion & { ocupacion: OcupacionBreve }
export type Aliados = { misma_ocupacion: Aliado[]; otras: Aliado[] }
export type PreguntaBasePublica = { codigo: string; texto: string }
export type TipoReaccionPublico = {
  codigo: string
  nombre: string
  descripcion: string
  pregunta: string
  comentario_obligatorio: boolean
  icono: string
}
export type ConteosEntrevistas = { salon: number; leyendas: number; mias: number }
export type InvestigacionesCuenta = {
  en_curso: InvestigacionEnCurso | null
  aliados: Aliados
  preguntas_base: PreguntaBasePublica[]
  tipos_reaccion: TipoReaccionPublico[]
  favoritos_leyenda: number
  conteos: ConteosEntrevistas
}
export type EstadoSugerencias = 'LISTAS' | 'SIN_SUGERENCIAS' | 'ERROR'
export type SugerenciasGuion = { estado: EstadoSugerencias; sugerencias: SugerenciaGuionPublica[] }
export type TarjetaEntrevista = {
  codigo: string
  titulo: string
  ocupacion: OcupacionBreve
  profesional: string
  duracion: string
  resumen: string
  fecha_hora: string
  autores: PersonaInvestigacion[]
  destacada: boolean
  leyenda: boolean
  reacciones: number
  favoritos: number
  favorita: boolean
  vista: boolean
  propia: boolean
  // Solo en MIAS y en el detalle.
  reacciones_por_tipo?: Record<string, number> | null
}
export type PaginaEntrevistas = { total: number; favoritos_leyenda: number; items: TarjetaEntrevista[] }
// `tipo` nulo: comentario de la orientadora.
export type ReaccionPublica = {
  codigo: string
  autor: PersonaInvestigacion
  tipo: string | null
  comentario: string | null
  creada_en: string
  editada_en: string | null
  propia: boolean
  reportada_por_mi: boolean
}
export type EntrevistaDetalle = TarjetaEntrevista & {
  enlace: string
  editada_en: string | null
  favoritos_leyenda: number
  reportada_por_mi: boolean
  lista_reacciones: ReaccionPublica[]
}
export type VistaEntrevistas = 'SALON' | 'LEYENDAS' | 'MIAS'
export type OrdenEntrevistas = 'RECIENTES' | 'REACCIONADAS'
export type FiltrosEntrevistas = {
  vista: VistaEntrevistas
  buscar?: string
  favoritas?: boolean
  no_vistas?: boolean
  destacadas?: boolean
  orden?: OrdenEntrevistas
  ocupacion?: string
}
// Entradas de las acciones del estudiante (sin `cuenta`, que pone el almacén).
export type PreguntaGuionEntrada = { origen: OrigenPreguntaGuion; texto: string; sugerencia?: string | null }
export type FichaEntrevistaEntrada = {
  titulo: string
  profesional: string
  duracion: string
  enlace: string
  resumen: string
}
// --- Orientadora ---
export type EstadoPublicacion = 'SIN_DESTACAR' | 'DESTACADA' | 'LEYENDA'
// `salon`: código del salón; `lo_que_pensaba`, solo en el detalle.
export type AutorPublicacion = {
  codigo: string
  nombre: string
  salon: string | null
  lo_que_pensaba?: LoQuePienso | null
}
export type FilaPublicacion = {
  codigo: string
  titulo: string
  autores: AutorPublicacion[]
  ocupacion: OcupacionBreve
  fecha_hora: string
  reacciones: number
  favoritos: number
  estado: EstadoPublicacion
  reportes_pendientes: number
  comentarios_reportados: number
  de_sus_salones: boolean
}
export type PaginaPublicaciones = { total: number; favoritos_leyenda: number; items: FilaPublicacion[] }
export type FiltrosPublicaciones = {
  salon?: string
  estado?: EstadoPublicacion
  con_reportes?: boolean
  buscar?: string
}
export type ReportePublico = {
  codigo: string
  motivo: MotivoReporte
  detalle: string | null
  fecha_hora: string
}
export type AutorModerado = PersonaInvestigacion & { salon: string | null }
export type ReaccionModerada = {
  codigo: string
  autor: AutorModerado
  tipo: string | null
  comentario: string | null
  creada_en: string
  editada_en: string | null
  propia: boolean
  reportes: ReportePublico[]
}
export type PublicacionDetalle = {
  codigo: string
  titulo: string
  ocupacion: OcupacionBreve
  profesional: string
  duracion: string
  enlace: string
  resumen: string
  fecha_hora: string
  editada_en: string | null
  estado: EstadoPublicacion
  de_sus_salones: boolean
  favoritos: number
  favoritos_leyenda: number
  reacciones_por_tipo: Record<string, number>
  autores: AutorPublicacion[]
  reportes: ReportePublico[]
  reacciones: ReaccionModerada[]
  // F09: el catálogo, para nombrar los tipos.
  tipos_reaccion: TipoReaccionPublico[]
}
