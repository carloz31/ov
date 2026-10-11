export type DecisionStatus = 'active' | 'favorite' | 'archived'

export type DecisionTimelineEvent = {
  date: string
  detail?: string
  id: string
  type: 'created' | 'certainty' | 'favorite' | 'archived' | 'reactivated' | 'reconfirmed'
}

export type DecisionInfluence = {
  id: string
  person: string
  description: string
}

export type DecisionSheet = {
  id: string
  name: string
  sourceId?: string
  status: DecisionStatus
  createdAt: string
  interestedSince: string
  motivation: string
  influences: DecisionInfluence[]
  noInfluence: boolean
  optionQuality: string
  knowledge: string
  dailyWork: string
  fit: string
  selfKnowledge: string
  selfKnowledgeNote: string
  strengths: string
  challenges: string
  preparation: string[]
  customPreparation: string[]
  budgets: DecisionBudget[]
  interviewed: boolean
  interviewFindings: string
  researched: boolean
  researchFindings: string
  timeline: DecisionTimelineEvent[]
}

export type DecisionBudget = {
  id: string
  label: string
  name: string
  modality: '' | 'public' | 'private'
  city: string
  duration: string
  housing: 'own' | 'rent'
  enrollmentCost: string
  tuitionCost: string
  materialsCost: string
  monthlyLivingCost: string
  academyMonths: string
  academyCost: string
  scholarship: boolean
  scholarshipNote: string
}

export function createDecisionSheet(name: string, sourceId?: string): DecisionSheet {
  const createdAt = new Date().toISOString()
  return {
    id: crypto.randomUUID(),
    name,
    sourceId,
    status: 'active',
    createdAt,
    interestedSince: '',
    motivation: '',
    influences: [],
    noInfluence: false,
    optionQuality: '',
    knowledge: '',
    dailyWork: '',
    fit: '',
    selfKnowledge: '',
    selfKnowledgeNote: '',
    strengths: '',
    challenges: '',
    preparation: [],
    customPreparation: [],
    budgets: [],
    interviewed: false,
    interviewFindings: '',
    researched: false,
    researchFindings: '',
    timeline: [{ id: crypto.randomUUID(), type: 'created', date: createdAt }],
  }
}
