import {
  affinities,
  changes,
  priorityProgress,
  priorityActivities,
  highlightedDimensions,
  interestCode,
  isFlatProfile,
  observationCounts,
  profileAlerts,
  profileAlertLabels,
  progressGroups,
  signalSummary,
} from '@/features/student-tracking/lib/selectors'
import type {
  ActivityState,
  ProfileActivity,
  ProfileCatalog,
  QuestionnaireApplication,
  QuestionnaireDefinition,
  StudentProfile,
} from '@/types/studentProfile'

export function resolveSalon(requested: string | null, saved: string | null, salons: string[]) {
  const value = requested ?? saved ?? 'all'
  return value === 'all' || salons.includes(value) ? value : 'all'
}
export function applicationState(application?: QuestionnaireApplication): ActivityState {
  if (!application) return 'not-started'
  if (application.result?.kind === 'comparison')
    return application.result.exit?.length
      ? 'completed'
      : application.result.entry.length
        ? 'in-progress'
        : 'not-started'
  return application.state
}
const states = (values: ActivityState[]) => ({
  completed: values.filter((s) => s === 'completed').length,
  progress: values.filter((s) => s === 'in-progress').length,
  pending: values.filter((s) => s === 'not-started').length,
})
export function diaryCounts(student: StudentProfile) {
  const counts = { guided: 0, dailyPrompt: 0, free: 0, unclassified: 0, total: 0 }
  for (const day of student.signals) {
    counts.total += day.diaryEntries
    if (day.diaryEntriesByType) {
      counts.guided += day.diaryEntriesByType.guided
      counts.dailyPrompt += day.diaryEntriesByType.dailyPrompt
      counts.free += day.diaryEntriesByType.free
    } else counts.unclassified += day.diaryEntries
  }
  return counts
}
export type TopRow = { id: string; name: string; count: number; planA?: number }
export function optionTop(
  students: StudentProfile[],
  catalog: { id: string; name: string }[],
  ids: (student: StudentProfile) => string[],
  primary?: (student: StudentProfile, id: string) => boolean,
): TopRow[] {
  const rows = [...new Map(catalog.map((item) => [item.id, item])).values()].map((item) => ({
    ...item,
    count: students.filter((student) => new Set(ids(student)).has(item.id)).length,
    ...(primary ? { planA: students.filter((student) => primary(student, item.id)).length } : {}),
  }))
  return rows
    .filter((row) => row.count)
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, 'es', { sensitivity: 'base' }))
    .slice(0, 5)
}
export function interestTop(
  students: StudentProfile[],
  catalog: { id: string; name: string; shortName?: string }[],
  plans: (student: StudentProfile) => string[],
  favorites: (student: StudentProfile) => string[],
  primary?: (student: StudentProfile, id: string) => boolean,
) {
  return [...new Map(catalog.map((item) => [item.id, item])).values()]
    .map((item) => ({
      ...item,
      plans: students.filter((student) => new Set(plans(student)).has(item.id)).length,
      favorites: students.filter((student) => new Set(favorites(student)).has(item.id)).length,
      ...(primary ? { planA: students.filter((student) => primary(student, item.id)).length } : {}),
    }))
    .filter((row) => row.plans || row.favorites)
    .sort(
      (a, b) =>
        b.plans - a.plans ||
        b.favorites - a.favorites ||
        a.name.localeCompare(b.name, 'es', { sensitivity: 'base' }),
    )
    .slice(0, 5)
}
export function classroomSummary(
  students: StudentProfile[],
  allStudents: StudentProfile[],
  activities: ProfileActivity[],
  questionnaires: QuestionnaireDefinition[],
  blocks: { id: string; name: string }[],
  catalog: ProfileCatalog,
) {
  const total = students.length
  const priority = questionnaires.filter((q) => q.priority)
  const questionnaireRows = questionnaires.map((definition) => {
    const applications = students.map((s) =>
      s.questionnaires.find((q) => q.questionnaireId === definition.id),
    )
    const completed = applications.filter((a) => applicationState(a) === 'completed')
    const frequency = new Map<string, number>()
    let flat = 0,
      entry = 0,
      exit = 0,
      increased = 0
    const add = (id: string) => frequency.set(id, (frequency.get(id) ?? 0) + 1)
    for (const application of applications) {
      const result = application?.result
      if (result?.kind === 'comparison') {
        if (result.entry.length) entry++
        if (result.entry.length && result.exit?.length) {
          exit++
          const deltas = changes(result)
          if (deltas.some((row) => row.label === 'Subió')) increased++
          for (const row of deltas) if (row.label === 'Subió') add(row.dimensionId)
        }
      } else if (applicationState(application) === 'completed' && result) {
        if (result.kind === 'interests') {
          if (isFlatProfile(result.values)) flat++
          else {
            const first = interestCode(result.values, definition.dimensions)[0]
            if (first) add(first)
          }
        } else for (const id of highlightedDimensions(result.values)) add(id)
      }
    }
    const frequent = definition.dimensions
      .map((dimension, order) => ({
        id: dimension.id,
        name: dimension.name,
        count: frequency.get(dimension.id) ?? 0,
        order,
      }))
      .filter((row) => row.count)
      .sort((a, b) => b.count - a.count || a.order - b.order)
      .slice(0, 3)
    return {
      definition,
      ...states(applications.map(applicationState)),
      results: completed.length,
      frequent,
      flat,
      entry,
      exit,
      increased,
    }
  })
  const recordRows = activities
    .filter((a) => a.kind === 'record')
    .sort((a, b) => a.order - b.order)
    .map((activity) => ({
      activity,
      ...states(
        students.map((s) => s.activities.find((a) => a.activityId === activity.id)?.state ?? 'not-started'),
      ),
      underdeveloped: students.reduce((sum, s) => sum + observationCounts(s, activity.id).underdeveloped, 0),
      attention: students.filter((s) => observationCounts(s, activity.id).attention > 0).length,
    }))
  const studentAlerts = students.map((s) => profileAlerts(s, allStudents, activities))
  const alertRows = Object.keys(profileAlertLabels)
    .map((code, order) => ({
      code: code as keyof typeof profileAlertLabels,
      count: studentAlerts.filter((alerts) => alerts.includes(code as keyof typeof profileAlertLabels))
        .length,
      order,
    }))
    .filter((row) => row.count)
    .sort((a, b) => b.count - a.count || a.order - b.order)
  const planCount = (student: StudentProfile) =>
    new Set(
      student.plans
        .filter((p) => p.careerId && catalog.careers.some((c) => c.id === p.careerId))
        .map((p) => p.slot),
    ).size
  const signals = students.map(signalSummary)
  const security = signals.filter((s) => s.latest)
  const diaries = students.map(diaryCounts)
  const sessions = students.filter((s) => s.signals.some((day) => day.session))
  const sum = (key: keyof ReturnType<typeof diaryCounts>) => diaries.reduce((sum, d) => sum + d[key], 0)
  const guardians = students.filter((s) => s.guardian)
  const guardianRoutes = guardians.filter((s) => s.guardian!.total > 0)
  const grouped = students.map((s) => progressGroups(s, activities, blocks, 'blocks'))
  const template = progressGroups(
    { activities: [], availableBlockIds: [] } as unknown as StudentProfile,
    activities,
    blocks,
    'blocks',
  )
  return {
    total,
    priorityCount: priority.length,
    questionnaireComplete: priority.length
      ? students.filter((s) =>
          priority.every(
            (q) => applicationState(s.questionnaires.find((a) => a.questionnaireId === q.id)) === 'completed',
          ),
        ).length
      : null,
    withPlans: students.filter((s) => planCount(s) > 0).length,
    priorityActivityCount: priorityActivities(activities, questionnaires).length,
    average:
      total && priorityActivities(activities, questionnaires).length
        ? students.reduce((sum, s) => sum + priorityProgress(s, activities, questionnaires).rawPercent, 0) /
          total
        : null,
    withAlerts: studentAlerts.filter((a) => a.length).length,
    alerts: alertRows,
    questionnaires: questionnaireRows,
    records: recordRows,
    recordObservations: {
      underdeveloped: recordRows
        .filter((row) => row.activity.priority)
        .reduce((sum, row) => sum + row.underdeveloped, 0),
      attention: students.filter((student) =>
        recordRows.some(
          (row) => row.activity.priority && observationCounts(student, row.activity.id).attention > 0,
        ),
      ).length,
    },
    interests: {
      careers: interestTop(
        students,
        catalog.careers,
        (s) => s.plans.map((p) => p.careerId),
        (s) => s.favorites.careers,
        (s, id) => s.plans.some((p) => p.slot === 'A' && p.careerId === id),
      ),
      institutions: interestTop(
        students,
        catalog.institutions,
        (s) => s.plans.flatMap((p) => (p.budget?.institutionId ? [p.budget.institutionId] : [])),
        (s) => s.favorites.institutions,
      ),
    },
    plans: {
      three: students.filter((s) => planCount(s) === 3).length,
      partial: students.filter((s) => [1, 2].includes(planCount(s))).length,
      none: students.filter((s) => !planCount(s)).length,
      initialA: students.filter(
        (s) =>
          s.initialInterest &&
          s.plans.some((p) => p.slot === 'A' && p.careerId === s.initialInterest!.careerId),
      ).length,
      initialOther: students.filter(
        (s) =>
          s.initialInterest &&
          !s.plans.some((p) => p.slot === 'A' && p.careerId === s.initialInterest!.careerId) &&
          s.plans.some((p) => p.careerId === s.initialInterest!.careerId),
      ).length,
      initialOutside: students.filter(
        (s) => s.initialInterest && !s.plans.some((p) => p.careerId === s.initialInterest!.careerId),
      ).length,
      noInitial: students.filter((s) => !s.initialInterest).length,
    },
    tops: {
      plans: optionTop(
        students,
        catalog.careers,
        (s) => s.plans.map((p) => p.careerId),
        (s, id) => s.plans.some((p) => p.slot === 'A' && p.careerId === id),
      ),
      careers: optionTop(students, catalog.careers, (s) => s.favorites.careers),
      occupations: optionTop(students, catalog.occupations, (s) => s.favorites.occupations),
      affinities: optionTop(students, catalog.occupations, (s) => affinities(s, catalog).occupations),
      institutions: optionTop(students, catalog.institutions, (s) => s.favorites.institutions),
    },
    blocks: template.map((group) => ({
      id: group.id,
      title: group.title,
      completed:
        group.total > 0
          ? grouped.filter((groups) => groups.find((g) => g.id === group.id)?.rawPercent === 100).length
          : 0,
      activities: group.total,
    })),
    diary: {
      total: sum('total'),
      guided: sum('guided'),
      dailyPrompt: sum('dailyPrompt'),
      free: sum('free'),
      unclassified: sum('unclassified'),
      withFree: diaries.filter((d) => d.free > 0).length,
      base: sessions.length,
      average: sessions.length
        ? sessions.reduce((sum, s) => sum + diaryCounts(s).total, 0) / sessions.length
        : null,
    },
    security: {
      base: security.length,
      average: security.length
        ? security.reduce((sum, s) => sum + s.latest!.security!, 0) / security.length
        : null,
      trends: ['En aumento', 'Estable', 'En descenso', 'Sin datos suficientes'].map((label) => ({
        label,
        count: signals.filter((s) => s.securityTrend === label).length,
      })),
    },
    family: {
      registered: guardians.length,
      completed: guardianRoutes.filter((s) => s.guardian!.completed >= s.guardian!.total).length,
      base: guardianRoutes.length,
      conversations: students.reduce(
        (sum, s) => sum + s.conversations.filter((c) => c.state === 'completed').length,
        0,
      ),
      possible: students.reduce((sum, s) => sum + s.conversations.length, 0),
    },
  }
}
