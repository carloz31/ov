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
  | 'SECCION'
  | 'SECCION_PLAN'
  | 'CONVERSACION'
export type EstadoActividad = 'BLOQUEADA' | 'DISPONIBLE' | 'EN_CURSO' | 'COMPLETADA'
export type EstadoDisponibilidad = 'DISPONIBLE' | 'BLOQUEADA'
export type RolCuenta = 'ESTUDIANTE' | 'APODERADO' | 'ORIENTADORA'
export type CuentaResumen = { codigo: string; nombre: string; rol: RolCuenta }
// B17 · app/schemas/sesion.py
export type IngresoEntrada = { usuario: string; contrasena: string }
export type IngresoRespuesta = { token: string; expira_en: string; cuenta: CuentaResumen }
export type HijoSesion = { codigo: string; nombre: string; salon: string | null; parentesco: string | null }
export type SalonSesion = { codigo: string; nombre: string; es_principal: boolean }
export type SesionRespuesta = {
  cuenta: CuentaResumen
  expira_en: string
  hijos: HijoSesion[]
  salones: SalonSesion[]
}
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
// app/schemas/diario.py
export type EntradaDesbloqueada = { codigo: string; nombre: string; personalizada: boolean; texto: string | null }
export type RespuestaAccion = {
  eventos_registrados: { tipo: TipoEventoUso; referencia: string | null; fecha_hora: string }[]
  nuevos_desbloqueos: DesbloqueoNuevo[]
  entradas_desbloqueadas?: EntradaDesbloqueada[]
}
export type RespuestaCompletarActividad = RespuestaAccion
// app/schemas/motor.py
export type MotivoBloqueo = {
  regla: string
  mensaje: string
  condiciones_faltantes: ProgresoCondicion[]
  evaluador_especial?: ResultadoEvaluador | null
}
// app/schemas/secciones.py
export type SeccionEstado = {
  codigo: string
  nombre: string
  estado: EstadoDisponibilidad
  bloqueo: MotivoBloqueo[] | null
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

export type ResumenCuenta = { cuenta: CuentaResumen; nivel_actual: NivelActual | null }
export type ActividadCuenta = ActividadEstado & {
  tipo: 'INFORMATIVA' | 'REGISTRO' | 'CUESTIONARIO' | 'CASO' | 'BATALLA'
  orden: number
  contenido: string
  visibilidad: 'SIEMPRE' | 'AL_DESBLOQUEAR'
  visible: boolean
  requerida: boolean
  duracion_estimada_min: number | null
  descripcion: string | null
  bloqueo: MotivoBloqueo[] | null
}
export type BloqueActividades = Omit<BloqueEstado, 'actividades'> & {
  numero: number
  bloqueo: MotivoBloqueo[] | null
  actividades: ActividadCuenta[]
}
export type NivelEstado = NivelActual & { estado: 'BLOQUEADO' | 'OBTENIDO' }
export type LogrosCuenta = { insignias: InsigniaEstado[]; niveles: NivelEstado[] }
// app/schemas/familia.py · GET /cuentas/{c}/familia (B12)
export type AvanceRuta = { completadas: number; total: number; porcentaje: number }
export type Diploma = { obtenido: boolean; obtenido_en: string | null }
export type EstudianteVinculado = {
  codigo: string
  nombre: string
  avance: AvanceRuta
  nivel_actual: NivelActual | null
}
export type FamiliaApoderado = { avance: AvanceRuta; diploma: Diploma; estudiante: EstudianteVinculado | null }
