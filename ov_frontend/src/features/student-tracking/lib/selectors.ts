import type {
  DimensionValue,
  ProfileActivity,
  ProfileAlertCode,
  ProfileCatalog,
  ProfilePlan,
  QuestionnaireApplication,
  QuestionnaireDefinition,
  QuestionnaireResult,
  StudentProfile,
} from '@/types/studentProfile'

export const profileAlertLabels: Record<ProfileAlertCode, string> = {
  AVANCE_BAJO_PROMEDIO: 'Avance bajo',
  FAMILIA_NO_REGISTRADA: 'Sin familia registrada',
  SIN_INTERESES: 'Sin intereses',
  REGISTRO_REQUIERE_ATENCION: 'Registro por revisar',
}
export const trendThresholds = { security: 0.5, diary: 0.5 }
export const fullName = (student: StudentProfile) => `${student.nombres} ${student.apellidos}`
export const normalizeSearch = (value: string) =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('es')
    .trim()
export const dateKey = (value: string | Date) =>
  new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Lima',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date(value))
export function relativeAccess(value: string | null, now: string | Date = new Date()) {
  if (!value) return 'Nunca ingresó'
  const days = Math.max(0, Math.round((Date.parse(dateKey(now)) - Date.parse(dateKey(value))) / 86400000))
  return days === 0 ? 'hoy' : days === 1 ? 'ayer' : `hace ${days} días`
}
export const displayDate = (value?: string) =>
  value
    ? new Date(value.length === 10 ? `${value}T12:00:00-05:00` : value).toLocaleDateString('es-PE', {
        timeZone: 'America/Lima',
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      })
    : 'Sin fecha registrada'
export function progress(student: StudentProfile, activities: ProfileActivity[]) {
  const ids = new Set(activities.map((activity) => activity.id))
  const completed = new Set(
    student.activities
      .filter((entry) => ids.has(entry.activityId) && entry.state === 'completed')
      .map((entry) => entry.activityId),
  ).size
  const rawPercent = ids.size ? (completed / ids.size) * 100 : 0
  return { completed, total: ids.size, rawPercent, percent: Math.round(rawPercent) }
}
export const generalProgress = (student: StudentProfile, activities: ProfileActivity[]) =>
  progress(student, activities)

export function progressGroups(
  student: StudentProfile,
  activities: ProfileActivity[],
  blocks: { id: string; name: string }[],
  group: 'blocks' | 'types',
) {
  const unique = [...new Map(activities.map((a) => [a.id, a])).values()]
  const core = unique.filter((a) => a.required)
  const free = unique.filter((a) => !a.required)
  const categories =
    group === 'blocks'
      ? blocks.map((block) => ({
          id: block.id,
          title: block.name,
          entries: core.filter((a) => a.blockId === block.id),
          unavailable: !student.availableBlockIds.includes(block.id),
        }))
      : (
          [
            ['information', 'Informativas'],
            ['record', 'De registro'],
            ['questionnaire', 'Cuestionarios'],
          ] as const
        ).map(([kind, title]) => ({
          id: kind as string,
          title: title as string,
          entries: core.filter((a) => a.kind === kind),
          unavailable: false,
        }))
  if (group === 'blocks') {
    const others = core.filter((a) => !blocks.some((b) => b.id === a.blockId))
    if (others.length)
      categories.push({ id: 'other-blocks', title: 'Otros bloques', entries: others, unavailable: false })
  }
  categories.push({
    id: 'free',
    title: 'Actividades libres',
    entries: free,
    unavailable: free.length > 0 && free.every((a) => !student.availableBlockIds.includes(a.blockId)),
  })
  return categories.map(({ id, title, entries, unavailable }) => ({
    id,
    title,
    unavailable,
    ...progress(student, entries),
  }))
}
export const priorityProgress = (
  student: StudentProfile,
  activities: ProfileActivity[],
  questionnaires: QuestionnaireDefinition[],
) => progress(student, priorityActivities(activities, questionnaires))

export function priorityActivities(activities: ProfileActivity[], questionnaires: QuestionnaireDefinition[]) {
  const questionnaireIds = new Set(
    questionnaires.filter((item) => item.priority).flatMap((item) => item.activityIds),
  )
  return activities.filter(
    (item) => (item.kind === 'record' && item.priority) || questionnaireIds.has(item.id),
  )
}
export function classroomAverage(
  student: StudentProfile,
  students: StudentProfile[],
  activities: ProfileActivity[],
) {
  const classmates = students.filter((item) => item.salon === student.salon)
  return classmates.length
    ? classmates.reduce((sum, item) => sum + generalProgress(item, activities).rawPercent, 0) /
        classmates.length
    : 0
}
export function observationCounts(student: StudentProfile, activityId?: string) {
  const answers = student.activities
    .filter((item) => !activityId || item.activityId === activityId)
    .flatMap((item) => item.answers)
  return {
    underdeveloped: answers.filter((item) => item.underdeveloped).length,
    attention: answers.filter((item) => item.attention).length,
  }
}
export function profileAlerts(
  student: StudentProfile,
  students: StudentProfile[],
  activities: ProfileActivity[],
): ProfileAlertCode[] {
  const alerts: ProfileAlertCode[] = []
  if (generalProgress(student, activities).rawPercent < classroomAverage(student, students, activities))
    alerts.push('AVANCE_BAJO_PROMEDIO')
  if (!student.guardian) alerts.push('FAMILIA_NO_REGISTRADA')
  if (!student.plans.length && !student.favorites.careers.length && !student.initialInterest)
    alerts.push('SIN_INTERESES')
  if (observationCounts(student).attention) alerts.push('REGISTRO_REQUIERE_ATENCION')
  return alerts
}
export const isFlatProfile = (values: DimensionValue[]) =>
  values.length > 0 && values.every((item) => item.percent === values[0].percent)
export function highlightedDimensions(values: DimensionValue[]) {
  const highest = Math.max(...values.map((item) => item.percent))
  return values.filter((item) => item.percent === highest).map((item) => item.dimensionId)
}
export function interestCode(values: DimensionValue[], dimensions: QuestionnaireDefinition['dimensions']) {
  if (isFlatProfile(values)) return []
  return [...values]
    .sort(
      (a, b) =>
        b.percent - a.percent ||
        dimensions.findIndex((d) => d.id === a.dimensionId) -
          dimensions.findIndex((d) => d.id === b.dimensionId),
    )
    .slice(0, 3)
    .map((item) => item.dimensionId)
}
export function changes(result: Extract<QuestionnaireResult, { kind: 'comparison' }>) {
  return result.entry.map((entry) => {
    const exit = result.exit?.find((item) => item.dimensionId === entry.dimensionId)
    const delta =
      exit && entry.level !== undefined && exit.level !== undefined ? exit.level - entry.level : undefined
    return {
      dimensionId: entry.dimensionId,
      entry,
      exit,
      label:
        delta === undefined ? 'Salida pendiente' : delta > 0 ? 'Subió' : delta < 0 ? 'Bajó' : 'Se mantuvo',
    }
  })
}
export function changeSummary(result: Extract<QuestionnaireResult, { kind: 'comparison' }>) {
  if (!result.exit) return 'Salida pendiente'
  const rows = changes(result)
  return `Subió en ${rows.filter((r) => r.label === 'Subió').length}, se mantuvo en ${rows.filter((r) => r.label === 'Se mantuvo').length} y bajó en ${rows.filter((r) => r.label === 'Bajó').length}`
}
export function affinities(student: StudentProfile, catalog: ProfileCatalog) {
  const result = student.questionnaires.find((q) => q.result?.kind === 'interests')?.result
  const available = result?.kind === 'interests'
  const occupations =
    available && !isFlatProfile(result.values)
      ? result.matches.slice(0, 10).map((item) => item.occupationId)
      : []
  const careers = [
    ...new Set(
      catalog.occupations.filter((item) => occupations.includes(item.id)).flatMap((item) => item.careerIds),
    ),
  ]
  const total = student.favorites.careers.length + student.favorites.occupations.length
  const matched =
    student.favorites.careers.filter((id) => careers.includes(id)).length +
    student.favorites.occupations.filter((id) => occupations.includes(id)).length
  return { available, occupations, careers, matched, total }
}
export function planCompleteness(plan: ProfilePlan) {
  const sections = [
    Boolean(plan.motivation.trim()),
    Object.values(plan.swot).every((value) => value.trim()),
    Boolean(
      plan.budget?.institutionId &&
      plan.budget.tuition !== null &&
      plan.budget.enrollment !== null &&
      plan.budget.housing !== null &&
      plan.budget.scholarship.trim(),
    ),
    plan.actions.some((item) => item.description.trim() && item.date),
  ]
  return sections.filter(Boolean).length * 25
}
export function favoriteRelations(student: StudentProfile, catalog: ProfileCatalog) {
  return {
    careers: student.favorites.careers.filter((id) =>
      catalog.occupations.some(
        (o) => student.favorites.occupations.includes(o.id) && o.careerIds.includes(id),
      ),
    ),
    occupations: student.favorites.occupations.filter((id) =>
      catalog.occupations
        .find((o) => o.id === id)
        ?.careerIds.some((careerId) => student.favorites.careers.includes(careerId)),
    ),
    institutions: student.favorites.institutions.filter((id) =>
      catalog.institutions
        .find((i) => i.id === id)
        ?.careerIds.some(
          (careerId) =>
            student.favorites.careers.includes(careerId) ||
            student.plans.some((p) => p.careerId === careerId),
        ),
    ),
  }
}
export function trend(values: number[], threshold: number) {
  if (values.length < 8) return 'Sin datos suficientes'
  const recent = values.slice(-7)
  const previous = values.slice(-14, -7)
  const average = (items: number[]) => items.reduce((sum, item) => sum + item, 0) / items.length
  const delta = average(recent) - average(previous)
  return Math.abs(delta) < threshold ? 'Estable' : delta > 0 ? 'En aumento' : 'En descenso'
}
export function signalSummary(student: StudentProfile) {
  const days = [...student.signals].sort((a, b) => a.date.localeCompare(b.date))
  const checkIns = days.filter((day) => day.security !== null)
  const sessions = days.filter((day) => day.session)
  return {
    latest: checkIns.at(-1),
    checkInDays: checkIns.length,
    securityTrend: trend(
      checkIns.map((day) => day.security!),
      trendThresholds.security,
    ),
    diaryTrend: trend(
      sessions.map((day) => day.diaryEntries),
      trendThresholds.diary,
    ),
    diaryAverage: sessions.length
      ? sessions.reduce((sum, day) => sum + day.diaryEntries, 0) / sessions.length
      : null,
  }
}
export const securityLabel = (value: number) =>
  value <= 2
    ? 'Nada seguro'
    : value <= 4
      ? 'Poco seguro'
      : value <= 6
        ? 'Algo seguro'
        : value <= 8
          ? 'Seguro'
          : 'Muy seguro'
export function questionnaireState(application: QuestionnaireApplication) {
  if (application.result?.kind === 'comparison')
    return application.result.exit
      ? `Entrada completada, salida completada · ${displayDate(application.result.exitDate)}`
      : 'Entrada completada, salida pendiente'
  return application.state === 'completed'
    ? `Completado · ${displayDate(application.completedAt)}`
    : application.state === 'in-progress'
      ? `En progreso (${application.completedParts} de ${application.totalParts} partes)`
      : 'No iniciado'
}
export function questionnaireKey(definition: QuestionnaireDefinition, application: QuestionnaireApplication) {
  const result = application.result
  if (!result) return questionnaireState(application)
  if (result.kind === 'comparison') return changeSummary(result)
  if (result.kind === 'interests')
    return isFlatProfile(result.values)
      ? 'Perfil plano'
      : interestCode(result.values, definition.dimensions).join(' · ')
  return definition.dimensions
    .filter((d) => highlightedDimensions(result.values).includes(d.id))
    .map((d) => d.name)
    .join(', ')
}
export function levelLabel(definition: QuestionnaireDefinition, value?: DimensionValue) {
  if (value?.level === undefined) return 'Salida pendiente'
  return (
    definition.scale?.[
      Math.max(0, Math.min((definition.scale?.length ?? 1) - 1, Math.round(value.level) - 1))
    ] ?? String(value.level)
  )
}
