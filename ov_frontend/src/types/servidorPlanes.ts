import type { MotivoBloqueo } from './servidor'
import type { CarreraResumen, FamiliaPublica, InstitucionResumen } from './servidorCatalogo'

// GET /cuentas/{c}/planes y /acciones/planes/* (B11; F07a): copia de app/schemas/planes.py.
export type Prioridad = 'A' | 'B' | 'C'
export type CodigoSeccionPlan = 'POR_QUE' | 'CONOCIMIENTO' | 'REALIDAD' | 'PASOS'
export type EstadoSeccionPlan = 'BLOQUEADA' | 'POR_EMPEZAR' | 'EN_PROCESO' | 'LISTA'
export type OrigenIdea = 'MIA' | 'FAMILIA' | 'CONOCIDO' | 'TEST' | 'PLATAFORMA'
export type PreguntaConocimiento = 'DIA_NORMAL' | 'DONDE_TRABAJAR' | 'CURSOS' | 'INGRESO' | 'CONOCE_ALGUIEN'
export type RespuestaConocimiento = 'SI' | 'MAS_O_MENOS' | 'NO'
export type OrigenDuda = 'PREGUNTA' | 'SUGERIDA' | 'PROPIA'
export type FrecuenciaGasto = 'UNICA' | 'MENSUAL' | 'POR_CICLO' | 'ANUAL'

export type Elegida = { opcion: string | null; otro: string | null }
export type MotivoPublico = Elegida & { posicion: number }
export type DudaPublica = {
  numero: number
  origen: OrigenDuda
  pregunta: PreguntaConocimiento | null
  opcion: string | null
  texto: string
  estado: 'ABIERTA' | 'CERRADA'
  // El del paso que la cerró, si lo hay.
  hallazgo: string | null
}
export type GastoPublico = {
  rubro: string | null
  otro: string | null
  monto: number
  frecuencia: FrecuenciaGasto
}
export type ComplicacionPublica = Elegida & { numero: number }
export type SugerenciaPublica = {
  numero: number
  origen: { duda: number | null; complicacion: number | null; texto: string }
  tipo: string
  texto: string
  estado: 'PENDIENTE' | 'ACEPTADA' | 'DESCARTADA'
  generada_por: 'LLM' | 'RESPALDO'
}
export type PasoPublico = {
  numero: number
  tipo: string
  texto: string
  origen: { duda: number | null; complicacion: number | null; sugerencia: number | null }
  estado: 'PENDIENTE' | 'HECHO'
  hallazgo: string | null
}
export type Medidores = { entusiasmo: number | null; capacidad: number | null; recursos: number | null }
export type SeccionPlan = {
  codigo: CodigoSeccionPlan
  nombre: string
  estado: EstadoSeccionPlan
  bloqueo: MotivoBloqueo[] | null
  guardada_en: string | null
}
// F07b: con la duración de la carrera en la institución, nula si no se conoce.
export type InstitucionPlan = InstitucionResumen & { duracion_ciclos: number | null }
export type PlanCarrera = {
  prioridad: Prioridad
  carrera: CarreraResumen
  institucion: InstitucionPlan | null
  idea_origen: OrigenIdea | null
  motivos: MotivoPublico[]
  relato: string | null
  conocimiento: Partial<Record<PreguntaConocimiento, RespuestaConocimiento | null>>
  dudas: DudaPublica[]
  camino: Elegida | null
  gastos: GastoPublico[]
  totales_por_frecuencia: Partial<Record<FrecuenciaGasto, number>>
  total_primer_anio: number
  // Nulo si la institución no tiene la duración de la carrera en ciclos.
  total_carrera: number | null
  financiamiento: Elegida[]
  complicaciones: ComplicacionPublica[]
  sugerencias: SugerenciaPublica[]
  pasos: PasoPublico[]
  medidores: Medidores
  secciones: SeccionPlan[]
  lista_para_comparar: boolean
  actualizada_en: string
}
export type AvisoPlanes = { tipo: 'MISMA_FAMILIA'; planes: Prioridad[]; familia: FamiliaPublica }
export type OpcionTarjeta = { codigo: string; texto: string }
export type PreguntaTarjeta = {
  codigo: PreguntaConocimiento
  texto: string
  // Con `{carrera}`, que el front reemplaza por el nombre.
  texto_duda: string
}
export type OpcionesTarjeta = {
  valores: OpcionTarjeta[]
  caminos: (OpcionTarjeta & { incluye_preparacion: boolean })[]
  rubros: (OpcionTarjeta & {
    frecuencia_recomendada: FrecuenciaGasto | null
    monto_referencia: number | null
    cero_si_publica: boolean
    solo_si_camino_prepara: boolean
  })[]
  financiamiento: OpcionTarjeta[]
  dificultades: OpcionTarjeta[]
  pasos: OpcionTarjeta[]
  dudas_sugeridas: OpcionTarjeta[]
  preguntas: PreguntaTarjeta[]
  // F07b: para calcular los totales en vivo con la fórmula del servidor.
  ciclos_por_anio: number
}
export type PlanesCuenta = {
  // Por prioridad: A, B y C.
  planes: PlanCarrera[]
  avisos: AvisoPlanes[]
  opcion_inicial: CarreraResumen | null
  maximo_planes: number
  opciones: OpcionesTarjeta
}

// Cuerpos de guardar-seccion (F07a: POR_QUE y CONOCIMIENTO; F07b: REALIDAD y PASOS).
export type ElegidaEntrada = { opcion: string } | { otro: string }
export type PorQueDatos = { idea_origen: OrigenIdea | null; motivos: ElegidaEntrada[]; relato: string | null }
export type DudaEntrada =
  { numero: number } | { origen: 'SUGERIDA'; opcion: string } | { origen: 'PROPIA'; texto: string }
export type ConocimientoDatos = {
  respuestas: Partial<Record<PreguntaConocimiento, RespuestaConocimiento>>
  dudas: DudaEntrada[]
}
export type GastoEntrada = ({ rubro: string } | { otro: string }) & {
  monto: number
  frecuencia: FrecuenciaGasto
}
// Una complicación que se conserva (`numero`) o una nueva, de la lista (`opcion`) u «Otro».
export type ComplicacionEntrada = { numero: number } | ElegidaEntrada
export type RealidadDatos = {
  institucion: string | null
  camino: ElegidaEntrada | null
  gastos: GastoEntrada[]
  financiamiento: ElegidaEntrada[]
  complicaciones: ComplicacionEntrada[]
}
// Un paso que se conserva o edita (`numero`), uno que acepta una sugerencia (`sugerencia`, con `tipo` y `texto`
// para editarla) o uno nuevo (`tipo` y `texto`).
export type PasoEntrada =
  | { numero: number; tipo: string; texto: string }
  | { sugerencia: number; tipo: string; texto: string }
  | { tipo: string; texto: string }
export type PasosDatos = { pasos: PasoEntrada[]; sugerencias_descartadas: number[] }
export type GuardarSeccionPlan =
  | { seccion: 'POR_QUE'; datos: PorQueDatos }
  | { seccion: 'CONOCIMIENTO'; datos: ConocimientoDatos }
  | { seccion: 'REALIDAD'; datos: RealidadDatos }
  | { seccion: 'PASOS'; datos: PasosDatos }
// Medidores (lo enviado reemplaza) y paso hecho.
export type MedidoresEntrada = Medidores
