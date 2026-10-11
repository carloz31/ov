export type Criterion = { id: string; descripcion: string; fraseAviso?: string; seguimiento: string }
export type ItemRef = { actividadId: string; nodoId: string }
export type Classification = 'ADECUADA' | 'INSUFICIENTE' | 'NO_EVALUADA'
export type AiMetadata = {
  modelo: string
  versionPrompt: string
  latenciaMs: number
  fechaHora: string
  error?: string
}
export type EvaluacionRespuesta = AiMetadata & {
  id: string
  respuestaId: string
  version: number
  revision: number
  texto: string
  clasificacion: Classification
  criteriosFaltantes: string[]
  preguntaSeguimiento?: string
}
export type Evaluation = EvaluacionRespuesta
export type RegistryResponse = ItemRef & {
  id: string
  estudianteId: string
  version: number
  revision: number
  entregaIds: string[]
  estado: 'EN_SEGUIMIENTO' | 'FINAL'
  textoInicial: string
  textoCompleto: string
}
export type ShownQuestion = AiMetadata & {
  id: string
  estudianteId: string
  tipo: 'PERSONALIZADA' | 'GENERICA_FALTA_DETALLE' | 'GENERICA_RESPALDO'
  texto: string
  cita?: string
  respuestaOrigen?: ItemRef & { respuestaId: string; version: number; texto: string; titulo: string }
  criteriosFaltantesOrigen: string[]
}
export type Scenario = {
  evaluaciones: Array<Classification | 'FALLO' | 'TIMEOUT'>
  criteriosFaltantes?: string[]
  generacion: 'VALIDA' | 'FALLO' | 'TIMEOUT' | 'CITA_INVALIDA'
}
export type ReflectionState = {
  version: 1
  respuestas: Record<string, RegistryResponse>
  evaluaciones: Evaluation[]
  preguntas: Record<string, ShownQuestion>
  eventos: Array<{ tipo: 'RESPUESTA_REFLEXIVA'; respuestaId: string; fechaHora: string }>
  desbloqueos: Array<{ actividadId: string; actividadOrigen: string; fechaHora: string; visto: boolean }>
  introVista: boolean
  primeraAdicionalVista: boolean
  anuncioAdicional?: { actividadId: string; primero: boolean }
  escenarios: Record<string, Scenario>
}
export const itemKey = (ref: ItemRef) => `${ref.actividadId}/${ref.nodoId}`
