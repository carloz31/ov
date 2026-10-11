// Contratos de app/schemas/ de ov_backend.
export type TipoObjetivo =
  | 'ACTIVIDAD'
  | 'BLOQUE'
  | 'FICHA'
  | 'INSIGNIA'
  | 'NIVEL'
  | 'CONVERSACIONES'
  | 'TESTIMONIO'
  | 'PREGUNTA_DIARIO'
export type EstadoActividad = 'BLOQUEADA' | 'DISPONIBLE' | 'EN_CURSO' | 'COMPLETADA'
export type EstadoDisponibilidad = 'DISPONIBLE' | 'BLOQUEADA'
export type CuentaResumen = { codigo: string; nombre: string; rol: 'ESTUDIANTE' | 'APODERADO' }
export type NivelActual = { numero: number; titulo: string }
export type DesbloqueosMarcados = { marcados: number }
export type ActividadEstado = { codigo: string; titulo: string; estado: EstadoActividad }
export type BloqueEstado = {
  codigo: string
  nombre: string
  espacio: 'MISIONES_CAMPO' | 'CIUDAD' | 'PORTAL_FAMILIA'
  estado: EstadoDisponibilidad
  actividades: ActividadEstado[]
}
export type ContenidoEstado = { codigo: string; titulo: string; estado: EstadoDisponibilidad }
export type InsigniaEstado = {
  codigo: string
  nombre: string
  descripcion: string | null
  requisito: string | null
  estado: 'BLOQUEADA' | 'OBTENIDA'
}
export type TipoEventoUso =
  | 'INGRESO'
  | 'COMPLETA_ACTIVIDAD'
  | 'COMPLETA_BLOQUE'
  | 'RESPUESTA_REFLEXIVA'
  | 'ESCRIBE_ENTRADA_DIARIO'
  | 'ESCRIBE_ENTRADA_LIBRE'
  | 'REGISTRA_CHECK_IN'
  | 'VISTA_CARRERA'
  | 'PUBLICA_ENTREVISTA'
  | 'SUPERA_CASO'
  | 'ESCRIBE_CARTA'
  | 'COMPLETA_CONVERSACION'
  | 'REINICIA_INSTRUMENTO'
  | 'INVITA_A_CREW'
  | 'FORMA_CREW'
  | 'VENCE_DESAFIO_INTACTO'
export type ProgresoCondicion = {
  tipo_evento: TipoEventoUso
  referencia: string | null
  tipo_conteo: 'EVENTOS' | 'REFERENCIAS_DISTINTAS' | 'DIAS_DISTINTOS'
  actual: number
  requerido: number
  cumplida: boolean
}
export type ResultadoEvaluador = { nombre: string; cumplido: boolean }
export type ObjetivoLegible = { codigo: string; nombre: string }
export type DesbloqueoNuevo = {
  regla: string
  tipo_objetivo: TipoObjetivo
  objetivo: ObjetivoLegible
  condiciones: ProgresoCondicion[]
  evaluador_especial?: ResultadoEvaluador | null
}
export type DesbloqueoLegible = {
  regla: string
  tipo_objetivo: TipoObjetivo
  objetivo: ObjetivoLegible
  fecha_hora: string
  visto: boolean
}
export type RespuestaAccion = {
  eventos_registrados: { tipo: TipoEventoUso; referencia: string | null; fecha_hora: string }[]
  nuevos_desbloqueos: DesbloqueoNuevo[]
}
export type RespuestaCompletarActividad = RespuestaAccion & {
  resultados_generados: { instrumento: string; aplicacion: string }[]
}
export type ProgresoObjetivo = {
  objetivo: { tipo: TipoObjetivo; codigo: string }
  disponible: boolean
  reglas: {
    regla: string
    cumplida: boolean
    condiciones: ProgresoCondicion[]
    evaluador_especial?: ResultadoEvaluador | null
  }[]
}
export type DetalleError = {
  mensaje?: string
  progreso?: ProgresoObjetivo
  items_faltantes?: string[]
  avance?: AvanceAplicacion | AvanceInstrumento[]
}
export type ErrorServidor =
  | { tipo: 'bloqueado'; detalle: DetalleError }
  | { tipo: 'sin_conexion' }
  | { tipo: 'http'; estado: number; detalle: unknown }
export type RespuestaServidor<T> = { tipo: 'ok'; datos: T } | ErrorServidor
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
  puntaje: number
  puntaje_maximo: number
  porcentaje: number
}
export type CoincidenciaPublica = {
  posicion: number
  codigo: string | null
  codigo_onet: string
  titulo: string
  correlacion: number
  ajuste: 'BEST_FIT' | 'GREAT_FIT' | 'GOOD_FIT'
}
export type CarreraRecomendada = {
  codigo: string
  nombre: string
  familia: string
  via: CoincidenciaPublica[]
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

export type ResumenCuenta = { cuenta: CuentaResumen; nivel_actual: NivelActual | null }
export type ActividadCuenta = ActividadEstado & {
  tipo: 'INFORMATIVA' | 'REGISTRO' | 'CUESTIONARIO' | 'CASO'
  orden: number
  contenido: string
  visibilidad: 'SIEMPRE' | 'AL_DESBLOQUEAR'
  visible: boolean
}
export type BloqueActividades = Omit<BloqueEstado, 'actividades'> & {
  numero: number
  actividades: ActividadCuenta[]
}
export type NivelEstado = NivelActual & { estado: 'BLOQUEADO' | 'OBTENIDO' }
export type LogrosCuenta = { insignias: InsigniaEstado[]; niveles: NivelEstado[] }
