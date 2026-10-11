import type { InstrumentPageId } from '@/types/discovery'

export type HelenaPageState = 'sealed' | 'ready' | 'revealed'
export type TipoResultadoHelena = 'COINCIDENCIAS' | 'DESTACADAS'
export type HelenaDimension = { code: string; name: string; score: number; description: string }

export type HelenaResult = {
  source: 'real' | 'demo'
  areas: HelenaDimension[]
  dimensiones?: HelenaDimension[]
  destacadas?: HelenaDimension[]
}

export type HelenaPage = {
  id: InstrumentPageId
  numeral: 'I' | 'II' | 'III'
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

export type PassportBadge = Achievement & { hidden?: boolean }

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
  items: Achievement[]
  title: string
}
