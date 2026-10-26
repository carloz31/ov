import type { InstrumentPageId } from '@/types/discovery'

export type HelenaPageState = 'sealed' | 'ready' | 'revealed'
export type TipoResultadoHelena = 'COINCIDENCIAS' | 'DESTACADAS' | 'COMPARACION'
export type HelenaDimension = { code: string; name: string; score: number; description: string }

export type HelenaResult = {
  source: 'real' | 'demo'
  areas: HelenaDimension[]
  dimensiones?: HelenaDimension[]
  destacadas?: HelenaDimension[]
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
export type PassportBadge = Achievement & { hidden?: boolean; pista?: string | null; obtenidaEn?: string | null }
// Una condición de una insignia o de un título; `actual` y `requerido` solo en las de conteo.
export type CondicionPasaporte = { texto: string; cumplida: boolean; actual?: number; requerido?: number }
// Cada bloque es una regla alternativa; `cumplidas` y `total`, de la más avanzada.
export type CondicionesPasaporte = { bloques: CondicionPasaporte[][]; cumplidas: number; total: number }

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
