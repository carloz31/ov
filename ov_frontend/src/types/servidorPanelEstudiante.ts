import type { ResultadoPublico } from './servidorInstrumentos'
// Ajuste panel-estudiantes: copia de `app/schemas/panel_estudiante.py` (lista y perfil del estudiante para la
// orientadora). Ninguna respuesta trae diario, cartas, puntajes de partida y llegada ni datos del LLM.
import type { SalonDatos } from './servidor'

export type EstadoTestPanel = 'LISTO' | 'POR_REVISAR' | 'EN_CURSO' | 'SIN_EMPEZAR'
export type DestinoPerfil = 'TESTS' | 'PLANES' | 'RESPUESTAS' | 'AVANCE'
export type ZonaPerfil = 'FUERTE' | 'EN_CAMINO' | 'POR_TRABAJAR'
export type CambioPerfil = 'SUBIO' | 'IGUAL' | 'BAJO'
export type MotivoRevision = 'PLANO' | 'PRISA'

export type TramoEstudiante = { codigo: string; numero: number; total: number; nombre: string | null }

// --- Lista ---

export type FilaEstudiante = {
  codigo: string
  nombre: string
  salon: SalonDatos
  tramo: TramoEstudiante
  test: EstadoTestPanel
  plan_a: string | null
  dias_sin_ingreso: number | null
  aviso: string | null
  avisos_mas: number
}
export type AccesoLista = { codigo: string; nombre: string | null; cantidad: number }
export type OpcionAviso = { codigo: string; nombre: string }
export type PaginaEstudiantes = {
  salon: SalonDatos | null
  total_estudiantes: number
  total: number
  accesos: AccesoLista[]
  avisos: OpcionAviso[]
  items: FilaEstudiante[]
}

// --- Perfil: cabecera y Resumen ---

export type ApoderadoCabecera = {
  nombre: string
  parentesco: string | null
  estado: 'AUN_NO_INGRESA' | 'INGRESO' | 'TERMINO_RUTA'
}
export type CabeceraEstudiante = {
  codigo: string
  nombre: string
  salon: SalonDatos
  dias_sin_ingreso: number | null
  apoderado: ApoderadoCabecera | null
  tramo: TramoEstudiante
}
export type AvisoPerfil = {
  codigo: string
  nombre: string
  descripcion: string | null
  destino: DestinoPerfil | null
}
export type GrupoAvisosPerfil = { codigo: string; nombre: string; avisos: AvisoPerfil[] }
export type TemaPerfil = { codigo: string; texto: string; destino: DestinoPerfil | null }
export type DimensionInteres = { codigo: string; nombre: string }
export type InteresesResumen = {
  instrumento: string
  estado: EstadoTestPanel
  fecha: string | null
  motivo_revision: MotivoRevision | null
  codigo: DimensionInteres[]
  areas: string[]
  partes_respondidas: number
  partes_total: number
}
export type InstitucionPlanPerfil = { nombre: string; tipo: string; gestion: string | null }
export type PlanResumen = {
  prioridad: number
  carrera: string
  institucion: InstitucionPlanPerfil | null
  en_areas: boolean | null
}
export type DimensionPartida = {
  codigo: string
  nombre: string
  zona_partida: ZonaPerfil | null
  zona_llegada: ZonaPerfil | null
  cambio: CambioPerfil | null
}
export type PartidaResumen = {
  estado: 'SIN_PARTIDA' | 'SOLO_PARTIDA' | 'CON_LLEGADA'
  fecha_partida: string | null
  fecha_llegada: string | null
  dimensiones: DimensionPartida[]
}
export type RespuestasResumen = {
  destacados: boolean
  completados: number
  total: number
  requiere_atencion: number
  sin_contenido: number
  aun_no_lo_sabe: number
}
export type NotaPerfil = { numero: number; texto: string; creada_en: string; actualizada_en: string }
export type PerfilEstudiante = {
  cabecera: CabeceraEstudiante
  avisos: GrupoAvisosPerfil[]
  temas: TemaPerfil[]
  // Ajuste pendientes-orientadora: cuántos temas se ven antes de «Ver los N temas restantes».
  temas_visibles: number
  intereses: InteresesResumen | null
  planes: PlanResumen[]
  partida: PartidaResumen
  respuestas: RespuestasResumen
  notas: NotaPerfil[]
}
export type NotaBorrada = { nota: number; borrada: boolean }

// --- Tests ---

export type EtiquetaInstrumentoPerfil = 'REQUISITO' | 'REQUISITO_ALGUNOS' | 'CAMINO' | 'OPCIONAL'
export type BarraInteres = { codigo: string; nombre: string; valor: number; en_codigo: boolean }
export type PlanFrenteAreas = { prioridad: number; carrera: string; en_areas: boolean }
export type TestIntereses = {
  instrumento: string
  nombre: string
  etiqueta: EtiquetaInstrumentoPerfil
  estado: EstadoTestPanel
  fecha: string | null
  motivo_revision: MotivoRevision | null
  mensaje: string
  aplicacion: string | null
  barras: BarraInteres[]
  codigo: DimensionInteres[]
  areas: string[]
  frente_planes: PlanFrenteAreas[]
  rehizo_plano: boolean
  partes_respondidas: number
  partes_total: number
}
export type Afirmacion = { item: string; enunciado: string; partida: string | null; llegada: string | null }
export type GrupoAfirmaciones = {
  codigo: 'BAJAS' | 'BAJARON' | 'SIGUEN_BAJAS' | 'MEJORARON'
  afirmaciones: Afirmacion[]
}
export type PartidaLlegada = {
  instrumento: string
  nombre: string
  etiqueta: EtiquetaInstrumentoPerfil
  mensaje: string
  resumen: PartidaResumen
  grupos: GrupoAfirmaciones[]
}
// El resultado completo de un cuestionario para la orientadora, con el nombre y la descripción del instrumento.
export type ResultadoCompletoPerfil = ResultadoPublico & {
  nombre_instrumento: string
  descripcion_instrumento: string
}
// Ajuste color-partida-llegada: «Ver detalle por dimensión», ya ordenado y clasificado por el servidor.
export type CambioAfirmacion = 'BAJO' | 'SIGUE_BAJA' | 'MEJORO' | 'IGUAL'
export type AfirmacionDetalle = {
  item: string
  enunciado: string
  partida: string | null
  llegada: string | null
  partida_baja: boolean
  llegada_baja: boolean
  cambio: CambioAfirmacion | null
}
export type DimensionDetalle = {
  codigo: string
  nombre: string
  zona_partida: ZonaPerfil | null
  zona_llegada: ZonaPerfil | null
  cambio: CambioPerfil | null
  afirmaciones: AfirmacionDetalle[]
}
export type ConteoDetalle = { codigo: ZonaPerfil | CambioPerfil; cantidad: number }
export type DetallePartidaLlegada = {
  instrumento: string
  nombre: string
  etiqueta: EtiquetaInstrumentoPerfil
  lectura: string
  estado: PartidaResumen['estado']
  fecha_partida: string | null
  fecha_llegada: string | null
  opciones_bajas: number
  conteo: ConteoDetalle[]
  dimensiones: DimensionDetalle[]
}
export type OtroCuestionario = {
  instrumento: string
  nombre: string
  etiqueta: EtiquetaInstrumentoPerfil
  estado: EstadoTestPanel
  aplicacion: string | null
  destaca: string[]
  para_practicar: string | null
  partes_respondidas: number
  partes_total: number
}
export type TestsEstudiante = {
  intereses: TestIntereses | null
  partida_llegada: PartidaLlegada | null
  otros: OtroCuestionario[]
}

// --- Planes ---

export type MedidoresPerfil = { entusiasmo: number | null; capacidad: number | null; recursos: number | null }
export type PlanVistazo = {
  prioridad: number
  carrera: string
  tipo: string
  en_areas: boolean | null
  institucion: InstitucionPlanPerfil | null
  idea_origen: string | null
  motivo_principal: string | null
  conoce_si: number
  conoce_total: number
  conoce_respondidas: number
  dudas_abiertas: number
  dudas_resueltas: number
  costo_primer_anio: number | null
  financiamiento: string[]
  complicaciones: string[]
  pasos_hechos: number
  pasos_total: number
  medidores: MedidoresPerfil
  secciones_listas: number
  secciones_total: number
}
export type AntesDePlanes = {
  opcion_inicial: string | null
  plan_a: string | null
  carreras_favoritas: string[]
  instituciones_favoritas: string[]
}
export type PlanesEstudiante = { planes: PlanVistazo[]; maximo_planes: number; antes: AntesDePlanes }
export type SeccionCompleta = {
  codigo: string
  nombre: string
  estado: 'BLOQUEADA' | 'POR_EMPEZAR' | 'EN_PROCESO' | 'LISTA'
}
export type PorQue = { idea_origen: string | null; motivos: string[]; relato: string | null }
export type PreguntaConoce = { codigo: string; texto: string; respuesta: 'SI' | 'MAS_O_MENOS' | 'NO' | null }
export type DudaCompleta = { texto: string; resuelta: boolean; hallazgo: string | null }
export type Conoce = { preguntas: PreguntaConoce[]; dudas: DudaCompleta[]; dudas_visibles: number }
export type Realidad = {
  institucion: InstitucionPlanPerfil | null
  ciclos: number | null
  camino: string | null
  costo_primer_anio: number | null
  costo_carrera: number | null
  rubros: string[]
  financiamiento: string[]
  complicaciones: string[]
}
export type PasoCompleto = {
  texto: string
  hecho: boolean
  hecho_en: string | null
  hallazgo: string | null
  sale_de: string | null
}
export type PlanCompleto = {
  prioridad: number
  carrera: string
  tipo: string
  en_areas: boolean | null
  actualizada_en: string
  medidores: MedidoresPerfil
  secciones: SeccionCompleta[]
  por_que: PorQue | null
  conoce: Conoce | null
  realidad: Realidad | null
  pasos: PasoCompleto[] | null
  planes: number[]
}

// --- Respuestas ---

export type EtiquetaRespuesta = 'REQUIERE_ATENCION' | 'SIN_CONTENIDO' | 'AUN_NO_LO_SABE'
export type ConteoEtiqueta = { etiqueta: EtiquetaRespuesta; cantidad: number }
export type OpcionElegidaLectura = {
  texto: string
  otra: boolean
  origen: string | null
  grupo: string | null
}
export type ItemLectura = {
  numero: number
  codigo: string
  nombre: string
  etiquetas: EtiquetaRespuesta[]
  dialogo: string | null
  ecos: Record<string, unknown>[]
  ecos_hoy: Record<string, unknown>[] | null
  ecos_de_hoy: boolean
  pregunta_eleccion: string | null
  eleccion: 'LISTA' | 'ORDENADA' | 'PIEZAS' | null
  elegidas: OpcionElegidaLectura[]
  pregunta_texto: string
  primera_respuesta: string | null
  repregunta: string | null
  segunda_respuesta: string | null
  respondido: boolean
}
export type RegistroFila = {
  actividad: string
  titulo: string
  tramo: string
  ciudad: boolean
  destacado: boolean
  estado: 'COMPLETADO' | 'EN_CURSO' | 'AUN_NO_LLEGA'
  fecha: string | null
  etiquetas: ConteoEtiqueta[]
  cambio_despues: boolean
}
export type RegistroLectura = { actividad: string; items: ItemLectura[] }
export type RespuestasEstudiante = {
  hay_destacados: boolean
  registros: RegistroFila[]
  leer_primero: RegistroLectura[]
}

// --- Avance y familia ---

export type TramoCamino = {
  numero: number
  nombre: string
  hechas: number
  total: number
  estado: 'COMPLETO' | 'VA_AQUI' | 'POR_ABRIR'
  siguiente: string | null
}
export type Senal = { nivel: number; fecha: string; banda: 'BAJA' | 'MEDIA' | 'ALTA' }
export type FamiliaAvance = {
  nombre: string
  parentesco: string | null
  ingreso: 'AUN_NO_INGRESA' | 'INGRESO'
  ruta_hechas: number
  ruta_total: number
  conversadas: number
  conversaciones_total: number
  esperan_apoderado: number
}
export type AvanceEstudiantePerfil = {
  tramos: TramoCamino[]
  opcionales_ciudad: number
  casos_superados: number
  senales: Senal[]
  viene_bajando: { senales: number; nivel_maximo: number } | null
  entradas_diario: number
  dias_ultima_entrada: number | null
  familia: FamiliaAvance | null
}
