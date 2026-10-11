export type InstrumentPageId = 'intereses' | 'inteligencias' | 'habilidades'

export type ResearchPublication = {
  interviewee: string
  summary: string
  change: string
  videoUrl: string
  coauthors: string[]
}

export type ResearchInProgress = {
  occupationId: string
  before: string
  ownQuestions: string[]
  guideStep?: 0 | 1 | 2
  guideReadyAt?: string
  publication?: ResearchPublication
  publishedVideoId?: string
}

export type InterviewReaction = { learned?: { text: string; createdAt: string }; liked?: string }

export type CatalogVisit = {
  tipo: 'VISTA_CARRERA' | 'VISTA_OCUPACION'
  referencia: string
  fechaHora: string
}

export type StudentDiscoveryState = {
  version: 1
  revealedPages: InstrumentPageId[]
  revealedPagesApi?: Record<string, Record<string, InstrumentPageId[]>>
  planOrder: string[]
  research?: ResearchInProgress
  publishedResearch: {
    videoId: string
    occupationId: string
    coauthors: string[]
    change: string
    interviewee?: string
  }[]
  reactions: Record<string, InterviewReaction>
  profileBadges: string[]
  profileBadgesConfigured: boolean
  profileBadgesApi?: Record<string, { profileBadges: string[]; profileBadgesConfigured: boolean }>
  badgeFirstSeenAt: Record<string, string>
  viewedCareerIds: string[]
  catalogVisits: CatalogVisit[]
}
