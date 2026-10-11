type ParentChild = {
  id: string
  name: string
  initials: string
  grade: string
  school: string
  progress: number
}

type ParentPortalView = 'overview' | 'activities' | 'children' | 'careers' | 'activity-player'

export type { ParentChild, ParentPortalView }
