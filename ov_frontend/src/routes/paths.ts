// Ajuste catalogo-apoderado: el catálogo del portal del apoderado y de la orientadora, con las mismas pestañas y
// detalles que el del estudiante.
const rutasCatalogo = (base: string) => ({
  catalog: {
    professions: `${base}/professions`,
    careers: `${base}/careers`,
    institutions: `${base}/institutions`,
  },
  career: (id: string) => `${base}/careers/${encodeURIComponent(id)}`,
  occupation: (id: string) => `${base}/professions/${encodeURIComponent(id)}`,
  institution: (id: string) => `${base}/institutions/${encodeURIComponent(id)}`,
})

const appPaths = {
  home: '/',
  login: '/login',
  roleSelection: '/profiles',
  student: {
    root: '/student',
    exploration: '/student/exploration',
    missions: '/student/missions',
    research: '/student/research',
    journal: '/student/journal',
    // Ajuste del diario (F05): el buzón completo.
    lumiLetters: '/student/journal/letters',
    signals: '/student/journal/signal',
    community: '/student/community',
    resources: '/student/resources',
    passport: '/student/profile?section=passport',
    conversations: '/student/conversations',
    // F08: la carta, el regalo y una conversación de Familia (api).
    conversationLetter: '/student/conversations/carta',
    conversationGift: '/student/conversations/regalo',
    conversation: (codigo: string) => `/student/conversations/tema/${encodeURIComponent(codigo)}`,
    catalog: {
      professions: '/student/catalog/professions',
      careers: '/student/catalog/careers',
      institutions: '/student/catalog/institutions',
    },
    testimonials: '/student/testimonials',
    profile: '/student/profile',
    decisions: '/student/profile/decisions',
    // F07a: un plan abierto en una sección (api).
    plan: (carrera: string, seccion?: string) =>
      `/student/profile/decisions/${encodeURIComponent(carrera)}${seccion ? `?seccion=${seccion}` : ''}`,
    case: (caseId: string) => `/student/cases/${caseId}`,
    casePlay: (caseId: string) => `/student/cases/${caseId}/play`,
  },
  parent: {
    root: '/parent',
    overview: '/parent/overview',
    activities: '/parent/activities',
    // F08: el diploma de compromiso, dentro de Mis actividades.
    diploma: '/parent/activities/diploma',
    conversations: '/parent/conversations',
    // F08: la carta, el regalo y una conversación del apoderado.
    conversationLetter: '/parent/conversations/carta',
    conversationGift: '/parent/conversations/regalo',
    conversation: (codigo: string) => `/parent/conversations/tema/${encodeURIComponent(codigo)}`,
    activity: (activityId: string) => `/parent/activities/${activityId}`,
    children: '/parent/children',
    child: (childId: string) => `/parent/children/${childId}`,
    careers: '/parent/careers',
    explorar: rutasCatalogo('/parent/explorar'),
  },
  counselor: {
    root: '/counselor',
    home: '/counselor/home',
    dashboard: '/counselor/home',
    classrooms: '/counselor/classrooms',
    students: '/counselor/students',
    student: (studentId: string) => `/counselor/students/${studentId}`,
    studentQuestionnaire: (studentId: string, questionnaireId: string) =>
      `/counselor/students/${studentId}/questionnaires/${questionnaireId}`,
    studentPriorities: '/counselor/students/priorities',
    studentRecord: (studentId: string, recordId: string) =>
      `/counselor/students/${studentId}/records/${recordId}`,
    familyRecord: (studentId: string, activityId: string) =>
      `/counselor/students/${studentId}/family-records/${activityId}`,
    reviews: '/counselor/reviews',
    publications: '/counselor/publications',
    interview: (interviewId: string) =>
      `/counselor/publications/interviews/${encodeURIComponent(interviewId)}`,
    priorities: '/counselor/priorities',
    families: '/counselor/families',
    teachers: '/counselor/teachers',
    plan: '/counselor/plan',
    messages: '/counselor/messages',
    mailbox: (mailbox: 'received' | 'sent') => `/counselor/messages/${mailbox}`,
    message: (mailbox: 'received' | 'sent', messageId: string) =>
      `/counselor/messages/${mailbox}/${messageId}`,
    reports: '/counselor/reports',
    adventure: '/counselor/adventure',
    settings: '/counselor/settings',
    explorar: rutasCatalogo('/counselor/explorar'),
  },
} as const

type RolPortal = 'ESTUDIANTE' | 'APODERADO' | 'ORIENTADORA'

// B17: cada rol entra a su portal; la raíz de cada portal redirige a su inicio.
const portalPorRol: Record<RolPortal, string> = {
  ESTUDIANTE: appPaths.student.missions,
  APODERADO: appPaths.parent.root,
  ORIENTADORA: appPaths.counselor.root,
}

const raizPorRol: Record<RolPortal, string> = {
  ESTUDIANTE: appPaths.student.root,
  APODERADO: appPaths.parent.root,
  ORIENTADORA: appPaths.counselor.root,
}

export { appPaths, portalPorRol, raizPorRol }
export type { RolPortal }
