type Occupation = {
  id: string
  contentStatus?: 'pending'
  name: string
  shortDescription: string
  contextualDescription: string
  sector: string
  color: string
  typicalWork: string
  workplaces: string
  skills: string[]
}

type OccupationDiscoveryState = 'unused' | 'unlocked' | 'explored'

type OccupationProfile = {
  occupationId: string
  discoveryState: OccupationDiscoveryState
  interested: boolean
}

type ProfessionalTestimonial = {
  id: string
  occupationId: string
  personName: string
  currentRole: string
  yearsExperience: number
  summary: string
  story: string
  highlights: string[]
  unlockSource: string
  unlockCaseId: string
  youtubeUrl: string
  youtubeEmbedUrl: string
}

export type { Occupation, OccupationDiscoveryState, OccupationProfile, ProfessionalTestimonial }
