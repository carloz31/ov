export type JournalEntry = {
  id: string
  title: string
  body: string
  kind: 'prompted' | 'open' | 'dynamic'
  createdAt: string
  linkedActivityId?: string
  promptShown?: string
  topicTags: string[]
  lockedTopicTags?: string[]
  missionId?: string
}
export type ReadinessCheckIn = {
  id: string
  createdAt: string
  linkedActivityId?: string
  value: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10
  entryId?: string
}
export type ResearchDraft = {
  step: number
  careerId: string
  invitees: string[]
  answers: string[]
  videoUrl: string
  reflection: string
  publishedId?: string
}
export type FamilyConversation = {
  id: string
  prompt?: string
  student?: string
  parent?: string
  studentAnsweredAt?: string
  parentAnsweredAt?: string
  studentMarkedAt?: string
  parentMarkedAt?: string
  studentReflection?: string
  parentReflection?: string
  completedAt?: string
}
export type AdventureNoticeKind = 'event' | 'news' | 'article' | 'publication'
export type AdventureNotice = {
  id: string
  title: string
  body: string
  date: string
  attendees: string[]
  kind: AdventureNoticeKind
}
export type AdventureState = {
  version: 1
  caminoContentVersion?: 2
  legacyCaminoCompleted?: boolean
  completedMissionIds: string[]
  parentCompletedActivityIds: string[]
  bookmarks: string[]
  journal: JournalEntry[]
  lumiRegistrations: { entryId: string; createdAt: string }[]
  readinessCheckIns: ReadinessCheckIn[]
  readinessScale: 10
  journalOnboardingSeen: boolean
  activityResponses: Record<string, string>
  activityUploads: Record<string, { name: string; size: number; type: string }>
  reflectionDrafts: Record<string, string>
  missionProgress: Record<string, number>
  questionnaire: {
    block: number
    answers: Record<string, string>
    openAnswers: Record<string, string>
    review: Record<string, 'pending' | 'consistent' | 'discrepancy'>
  }
  crewInvitations: { alias: string; status: 'pending' | 'accepted' | 'declined' }[]
  reports: {
    id: string
    postId: string
    body: string
    reason: string
    status: 'pending' | 'resolved' | 'hidden'
    createdAt: string
  }[]
  solvedCaseIds: string[]
  caseBestScores: Record<string, number>
  forestFireScoringVersion?: 2
  research: ResearchDraft
  videos: { id: string; title: string; alias: string; url: string; reflection: string; createdAt: string }[]
  interviewModeration: Record<string, { hidden: boolean; featured: boolean }>
  reactions: { videoId: string; kind: string; createdAt: string }[]
  notices: AdventureNotice[]
  conversations: FamilyConversation[]
  familyGift: {
    parentCommitment?: string
  }
  visits: string[]
  eventAttendance: Record<string, 'attended' | 'missed'>
}
