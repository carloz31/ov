export type CounselorView = 'home' | 'students' | 'reviews' | 'publications' | 'priorities' | 'settings'

export type AlertCode = 'A1' | 'A2' | 'A3' | 'A4' | 'A5' | 'A6'
export type TrafficLight = 'priority' | 'attention' | 'on-track'
export type ActivityType = 'REGISTRO' | 'ENCUENTRO' | 'TEST' | 'CASO' | 'MODULO_FAMILIAR'
export type ActivityStatus = 'EN_CURSO' | 'COMPLETADA'
export type ReviewResult = 'ADECUADO' | 'OBSERVADO'
export type ReviewStatus = 'SIN_ATENDER' | 'ACEPTADO' | 'REHACER_SUGERIDO' | 'REHECHO'
export type Direction = 'POSITIVA' | 'INVERSA' | 'NEUTRA'
export type InterestType = 'CARRERA' | 'OCUPACION'
export type InterestStatus = 'ACTIVO' | 'DESCARTADO'
export type RiasecMatch = 'GREAT' | 'GOOD' | 'BAD'
export type CareerCardPart = 'motivation' | 'influences' | 'knowledge' | 'preparations' | 'budgets'
export type ResourceType = 'PUBLICACION' | 'EVENTO'
export type Audience = 'ESTUDIANTES' | 'PADRES' | 'AMBOS'

export type Classroom = { id: string; name: string; grade: string; section: string; promotion: string }
export type TopicTag = { id: string; code: string; name: string; description: string }

export type Activity = {
  id: string
  code: string
  name: string
  block: string
  order: number
  type: ActivityType
  sequential: boolean
  participant: 'ESTUDIANTE' | 'APODERADO' | 'FAMILIAR'
  activatedById?: string
  tagIds: string[]
  premise?: string
}

export type ActivityProgress = {
  activityId: string
  status: ActivityStatus
  startedAt: string
  completedAt?: string
}

export type StudentRecord = {
  id: string
  activityId: string
  version: number
  text?: string
  fileName?: string
  date: string
  preliminaryReview: ReviewResult
  reviewReason?: string
  reviewStatus: ReviewStatus
  counselorComment?: string
  items: { id: string; prompt: string; response: string }[]
}

export type PerceptionItem = {
  id: string
  order: number
  statement: string
  direction: Direction
  tagIds: string[]
}

export type PerceptionApplication = {
  moment: 'ENTRADA' | 'SALIDA'
  date: string
  answers: Record<string, number>
}

export type CareerCard = {
  motivation?: string
  influences: { person: string; description: string }[]
  knowledge?: string
  preparations: string[]
  budgets: { institution: string; institutionType: string; duration: string; totalCost: number }[]
}

export type Interest = {
  id: string
  type: InterestType
  name: string
  origin: string
  addedAt: string
  status: InterestStatus
  discardedAt?: string
  discardReason?: string
  card?: CareerCard
  riasecCode?: string
  riasecMatch?: RiasecMatch
  partialCardParts?: CareerCardPart[]
}

export type InstitutionInterest = {
  id: string
  name: string
  type: 'UNIVERSIDAD' | 'INSTITUTO' | 'FUERZAS_ARMADAS' | 'POLICIA'
  addedAt: string
}

export type CheckIn = { id: string; date: string; value: 1 | 2 | 3 | 4 | 5 }
export type FamilyActivity = {
  activityId: string
  status?: ActivityStatus
  completedAt?: string
}
export type FamilyConversation = {
  activityId: string
  studentPrompt: string
  studentRecord?: string
  guardianPrompt: string
  guardianLetter?: string
  completedAt?: string
}
export type Guardian = {
  name: string
  relationship: string
  email: string
  phone: string
  firstAccess: string
  lastAccess: string
}

export type Student = {
  id: string
  code: string
  classroomId: string
  name: string
  email: string
  phone: string
  firstAccess: string
  lastAccess: string
  progress: ActivityProgress[]
  records: StudentRecord[]
  perceptions: PerceptionApplication[]
  entranceAnswers: { question: string; answer: string }[]
  testResults: { name: string; summary: string; details: string[] }[]
  interests: Interest[]
  institutions: InstitutionInterest[]
  diaryUsage: { total: number; spontaneous: number; prompted: number; lastEntry?: string; weekly: number[] }
  checkIns: CheckIn[]
  completedCaseIds: string[]
  completedCaseDates: Record<string, string>
  familyActivities: FamilyActivity[]
  familyConversations: FamilyConversation[]
  guardian?: Guardian
  additionalGuardians?: Guardian[]
}

export type Resource = {
  id: string
  type: ResourceType
  title: string
  description: string
  url?: string
  tagIds: string[]
  audience: Audience
  publicationDate: string
  viewCount: number
  favoriteCount: number
  event?: {
    dateTime: string
    organizer: string
    modality: 'PRESENCIAL' | 'VIRTUAL' | 'HIBRIDA'
    hasCost?: boolean
  }
}

export type Interview = {
  id: string
  authors: [string, string?, string?]
  classroomId: string
  subject: string
  date: string
  commentCount: number
  videoId?: string
  hidden?: boolean
  url: string
  reflection: string
  featured: boolean
}

export type WatchlistEntry = { studentId: string; reason?: string; date: string }
export type CounselorPortalState = {
  referenceDate: string
  classrooms: Classroom[]
  tags: TopicTag[]
  perceptionItems: PerceptionItem[]
  activities: Activity[]
  students: Student[]
  watchlist: WatchlistEntry[]
  excludedActivityIds: string[]
  resources: Resource[]
  interviews: Interview[]
}

export type CounselorAction =
  | { type: 'TOGGLE_WATCHLIST'; studentId: string; reason?: string }
  | { type: 'ADD_WATCHLIST_BULK'; studentIds: string[] }
  | { type: 'SET_WATCHLIST_REASON'; studentId: string; reason: string }
  | { type: 'TOGGLE_PRIORITY'; activityId: string }
  | {
      type: 'REVIEW_RECORD'
      studentId: string
      recordId: string
      status: Extract<ReviewStatus, 'ACEPTADO' | 'REHACER_SUGERIDO'>
      comment?: string
    }
  | { type: 'ADD_RESOURCE'; resource: Resource }
  | { type: 'UPDATE_RESOURCE'; resource: Resource }
  | { type: 'TOGGLE_INTERVIEW_FEATURED'; interviewId: string }
