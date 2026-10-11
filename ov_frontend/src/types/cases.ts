type ForestFireProfessional = {
  id: string
  name: string
  personName: string
  occupationId: string
  description: string
  skills: string[]
}

type ForestFireCommunityMessage = {
  id: string
  speaker: string
  context: string
  message: string
  position: { x: number; y: number }
  summary: string
}

type ForestFireProblem = {
  id: string
  title: string
  detail: string
  resultNarrative: string
  expectedProfessionalIds: string[]
  professionalContributions: Record<string, string>
  missingContributionNarratives: Record<string, string>
}

type ForestFirePhase = {
  id: string
  number: number
  name: string
  subtitle: string
  listenPrompt: string
  listenPromptMobile: string
  backgroundImage: string
  backgroundPosition: string
  messages: ForestFireCommunityMessage[]
  problems: ForestFireProblem[]
}

type ForestFireAssignments = Record<string, Record<string, string[]>>

type ForestFireWordCloudEntry = {
  occupationId: string
  mentions: number
  comments: string[]
}

export type {
  ForestFireAssignments,
  ForestFireCommunityMessage,
  ForestFirePhase,
  ForestFireProblem,
  ForestFireProfessional,
  ForestFireWordCloudEntry,
}
