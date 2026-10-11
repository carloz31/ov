export type ProfileAlertCode =
  'AVANCE_BAJO_PROMEDIO' | 'FAMILIA_NO_REGISTRADA' | 'SIN_INTERESES' | 'REGISTRO_REQUIERE_ATENCION'
export type ActivityState = 'not-started' | 'in-progress' | 'completed'
export type ActivityKind = 'information' | 'record' | 'questionnaire'
export type ProfileSection = 'summary' | 'questionnaires' | 'records' | 'options' | 'security'
export type ProfileActivity = {
  id: string
  title: string
  blockId: string
  order: number
  kind: ActivityKind
  required: boolean
  priority: boolean
  items?: { id: string; name: string; prompt: string }[]
}
export type Dimension = {
  id: string
  name: string
  description: string
  color: string
  possibleInterests?: string[]
}
export type DimensionValue = { dimensionId: string; percent: number; level?: number }
export type QuestionnaireDefinition = {
  id: string
  name: string
  priority: boolean
  activityIds: string[]
  kind: 'interests' | 'highlights' | 'comparison'
  dimensions: Dimension[]
  description: string
  interpretation: string
  scale?: string[]
}
export type QuestionnaireResult =
  | {
      kind: 'interests'
      values: DimensionValue[]
      matches: { occupationId: string; fit: 'very-high' | 'high' | 'good' }[]
    }
  | { kind: 'highlights'; values: DimensionValue[] }
  | {
      kind: 'comparison'
      entry: DimensionValue[]
      exit?: DimensionValue[]
      entryDate: string
      exitDate?: string
    }
export type QuestionnaireApplication = {
  questionnaireId: string
  state: ActivityState
  completedParts: number
  totalParts: number
  completedAt?: string
  result?: QuestionnaireResult
}
export type RecordAnswer = {
  itemId: string
  text: string
  date: string
  underdeveloped: boolean
  attention: boolean
}
export type ActivityEntry = {
  activityId: string
  state: ActivityState
  updatedAt?: string
  completedAt?: string
  answers: RecordAnswer[]
}
export type ProfilePlan = {
  slot: 'A' | 'B' | 'C'
  careerId: string
  updatedAt: string
  motivation: string
  swot: { strengths: string; weaknesses: string; opportunities: string; obstacles: string }
  budget?: {
    institutionId: string
    tuition: number | null
    enrollment: number | null
    housing: number | null
    scholarship: string
  }
  actions: { description: string; date: string }[]
}
export type StudentProfile = {
  id: string
  nombres: string
  apellidos: string
  email?: string
  salon: '5.° A' | '5.° B'
  ultimoIngreso: string | null
  availableBlockIds: string[]
  activities: ActivityEntry[]
  questionnaires: QuestionnaireApplication[]
  plans: ProfilePlan[]
  initialInterest?: { careerId: string; date: string }
  favorites: { careers: string[]; occupations: string[]; institutions: string[] }
  guardian?: { name: string; relationship: string; email?: string; completed: number; total: number }
  conversations: { id: string; name: string; state: 'unavailable' | 'pending' | 'completed'; date?: string }[]
  signals: {
    date: string
    session: boolean
    security: number | null
    diaryEntries: number
    diaryEntriesByType?: { guided: number; dailyPrompt: number; free: number }
  }[]
}
export type ProfileCatalog = {
  occupations: { id: string; name: string; description: string; careerIds: string[] }[]
  careers: { id: string; name: string; description: string }[]
  institutions: { id: string; name: string; shortName?: string; careerIds: string[] }[]
}
