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
    signals: '/student/journal/signal',
    community: '/student/community',
    resources: '/student/resources',
    passport: '/student/profile?section=passport',
    conversations: '/student/conversations',
    catalog: {
      professions: '/student/catalog/professions',
      careers: '/student/catalog/careers',
      institutions: '/student/catalog/institutions',
    },
    testimonials: '/student/testimonials',
    profile: '/student/profile',
    decisions: '/student/profile/decisions',
    case: (caseId: string) => `/student/cases/${caseId}`,
    casePlay: (caseId: string) => `/student/cases/${caseId}/play`,
  },
  parent: {
    root: '/parent',
    overview: '/parent/overview',
    activities: '/parent/activities',
    conversations: '/parent/conversations',
    activity: (activityId: string) => `/parent/activities/${activityId}`,
    children: '/parent/children',
    child: (childId: string) => `/parent/children/${childId}`,
    careers: '/parent/careers',
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
  },
} as const

export { appPaths }
