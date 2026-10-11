export type StudentView =
  | 'activities'
  | 'central'
  | 'missions'
  | 'profile-helena'
  | 'research-guide'
  | 'catalog-detail'
  | 'profile-general'
  | 'profile-decisions'
  | 'research'
  | 'journal'
  | 'journal-signals'
  | 'community'
  | 'resources'
  | 'investigations'
  | 'conversations'
  | 'catalog-professions'
  | 'catalog-careers'
  | 'catalog-institutions'

export const studentViews: StudentView[] = [
  'activities',
  'central',
  'missions',
  'profile-helena',
  'research-guide',
  'catalog-detail',
  'profile-general',
  'profile-decisions',
  'research',
  'journal',
  'journal-signals',
  'community',
  'resources',
  'investigations',
  'conversations',
  'catalog-professions',
  'catalog-careers',
  'catalog-institutions',
]

export function getStudentView(pathname: string): StudentView {
  if (pathname === '/student/profile/helena' || pathname.startsWith('/student/profile/helena/'))
    return 'profile-helena'
  if (pathname === '/student/research/guion') return 'research-guide'
  if (/^\/student\/catalog\/(careers|professions|institutions)\/[^/]+$/.test(pathname))
    return 'catalog-detail'
  const section = pathname.split('/')[2]
  if (pathname.endsWith('/journal/signal')) return 'journal-signals'
  if (
    [
      'activities',
      'research',
      'journal',
      'community',
      'resources',
      'investigations',
      'conversations',
    ].includes(section)
  )
    return section as StudentView
  if (pathname.endsWith('/missions')) return 'missions'
  if (pathname.endsWith('/catalog/careers')) return 'catalog-careers'
  if (pathname.endsWith('/catalog/institutions')) return 'catalog-institutions'
  if (pathname.endsWith('/catalog/professions')) return 'catalog-professions'
  if (pathname.endsWith('/testimonials')) return 'resources'
  if (pathname.endsWith('/profile/decisions')) return 'profile-decisions'
  if (pathname.endsWith('/profile')) return 'profile-general'
  return 'central'
}

export function getStudentViewLabel(view: StudentView): string {
  const labels: Partial<Record<StudentView, string>> = {
    activities: 'Mis actividades',
    research: 'Investigaciones',
    'research-guide': 'Mi guion de entrevista',
    'profile-helena': 'El libro de Helena',
    'profile-decisions': 'Mis planes',
    journal: 'Mi diario',
    'journal-signals': 'Evolución de mi señal',
    community: 'Salón y Crew',
    resources: 'Recursos',
    investigations: 'Investigaciones',
    conversations: 'En familia',
  }
  if (labels[view]) return labels[view]
  if (view.startsWith('catalog-')) return 'Catálogo'
  if (view === 'central' || view === 'missions') return 'Aventura'
  if (view === 'profile-general' || view === 'profile-decisions') return 'Mi perfil'
  return 'Exploración'
}

export function isDiscoveryView(view: StudentView) {
  return (
    view.startsWith('catalog-') ||
    view.startsWith('profile-') ||
    ['research', 'research-guide', 'investigations', 'resources', 'journal'].includes(view)
  )
}
