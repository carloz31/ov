import type { InstrumentPageId } from '@/types/discovery'
import type { ZonaDimension } from '@/types/servidor'

export type HelenaPageState = 'sealed' | 'ready' | 'revealed'
export type TipoResultadoHelena = 'COINCIDENCIAS' | 'DESTACADAS' | 'COMPARACION'
// Ajuste carga-instrumentos: en api, `score` es el puntaje visual 0–100 y llegan las cuatro piezas de la dimensión.
export type HelenaDimension = {
  code: string
  name: string
  score: number
  description: string
  ejemplos?: string
  fortalezas?: string[]
  desarrollo?: string[]
}

export type HelenaResult = {
  source: 'real' | 'demo'
  lectura?: string
  // Ajuste resultados-intereses (api): la línea de encuadre bajo el título y si la guía arranca abierta.
  mensaje?: string
  guiaAbierta?: boolean
  areas: HelenaDimension[]
  dimensiones?: HelenaDimension[]
  destacadas?: HelenaDimension[]
  // Ajuste perfil-capitulos (COMPARACION): la zona de cada dimensión, en su orden; sin puntajes.
  zonas?: { partida: ZonaDimension; llegada?: ZonaDimension }[]
}

export type HelenaPage = {
  id: InstrumentPageId
  numeral: 'I' | 'II' | 'III' | 'IV'
  title: string
  subtitle: string
  required: boolean
  state: HelenaPageState
  missions: { done: number; total: number }
  teaser: string
  activityHref?: string
  result?: HelenaResult
  demo: boolean
  perfilPlano?: boolean
}

// Ajuste pasaporte-perfil: `pista` (secreta) y `obtenidaEn` solo llegan del servidor.
// F5: `logro` (cómo se consiguió, en pasado) también llega solo del servidor.
export type PassportBadge = Achievement & {
  hidden?: boolean
  pista?: string | null
  obtenidaEn?: string | null
  logro?: string | null
}
// Una condición de una insignia o de un título; `actual` y `requerido` solo en las de conteo.
export type CondicionPasaporte = { texto: string; cumplida: boolean; actual?: number; requerido?: number }
// Cada bloque es una regla alternativa; `cumplidas` y `total`, de la más avanzada.
export type CondicionesPasaporte = { bloques: CondicionPasaporte[][]; cumplidas: number; total: number; mejor: number }

export type AchievementIcon =
  'campfire' | 'compass' | 'key' | 'message' | 'people' | 'send' | 'shield' | 'sparkles' | 'telescope'

export type Achievement = {
  code: `I${number}`
  description: string
  done: boolean
  icon: AchievementIcon
  message: string
  metaphor: string
  title: string
  vocationalMeaning: string
}

export type AchievementGroup = {
  description: string
  icon: 'compass' | 'key' | 'users'
  items: PassportBadge[]
  title: string
}
