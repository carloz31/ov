import type {
  Activity,
  AlertCode,
  CounselorPortalState,
  Interest,
  PerceptionApplication,
  Student,
  StudentRecord,
  TrafficLight,
} from '../types'

export const alertLabels: Record<AlertCode, string> = {
  A1: 'Inactividad',
  A2: 'Rezago',
  A3: 'Seguridad en descenso',
  A4: 'Registro observado',
  A5: 'Exploración cerrada',
  A6: 'Familia sin avance',
}

export function daysBetween(later: string | Date, earlier: string | Date) {
  return Math.floor((new Date(later).getTime() - new Date(earlier).getTime()) / 86_400_000)
}

export function getPriorityActivities(state: CounselorPortalState) {
  return state.activities.filter(
    (activity) =>
      activity.type === 'REGISTRO' &&
      activity.participant === 'ESTUDIANTE' &&
      !state.excludedActivityIds.includes(activity.id),
  )
}

export function getPriorityProgress(state: CounselorPortalState, student: Student) {
  const priority = getPriorityActivities(state)
  const completed = priority.filter((activity) =>
    student.progress.some((entry) => entry.activityId === activity.id && entry.status === 'COMPLETADA'),
  ).length
  return {
    completed,
    total: priority.length,
    percent: priority.length ? Math.round((completed / priority.length) * 100) : 100,
  }
}

export function median(values: number[]) {
  if (!values.length) return 0
  const sorted = [...values].sort((a, b) => a - b)
  const middle = Math.floor(sorted.length / 2)
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2
}

export function getClassroomMedian(state: CounselorPortalState, classroomId: string) {
  return median(
    state.students
      .filter((student) => student.classroomId === classroomId)
      .map((student) => getPriorityProgress(state, student).percent),
  )
}

export function latestRecords(student: Student) {
  const byActivity = new Map<string, StudentRecord>()
  student.records.forEach((record) => {
    const current = byActivity.get(record.activityId)
    if (!current || current.version < record.version) byActivity.set(record.activityId, record)
  })
  return [...byActivity.values()]
}

export function getPendingReviewRecords(state: CounselorPortalState, student?: Student) {
  const priorityIds = new Set(getPriorityActivities(state).map((activity) => activity.id))
  const students = student ? [student] : state.students
  return students.flatMap((item) =>
    latestRecords(item)
      .filter(
        (record) =>
          priorityIds.has(record.activityId) &&
          record.reviewStatus === 'SIN_ATENDER' &&
          record.preliminaryReview === 'OBSERVADO',
      )
      .map((record) => ({ student: item, record })),
  )
}

export function getFamilyActivityRows(state: CounselorPortalState, student: Student) {
  return student.familyActivities.map((entry) => {
    const activity = getActivity(state, entry.activityId)
    const trigger = activity?.activatedById
      ? student.progress.find((progress) => progress.activityId === activity.activatedById)
      : undefined
    return {
      ...entry,
      activatedAt: activity?.activatedById ? trigger?.startedAt : student.firstAccess,
    }
  })
}

export function getAlerts(
  state: CounselorPortalState,
  student: Student,
  now = state.referenceDate,
): AlertCode[] {
  const alerts: AlertCode[] = []
  if (daysBetween(now, student.lastAccess) >= 7) alerts.push('A1')
  const progress = getPriorityProgress(state, student).percent
  if (getClassroomMedian(state, student.classroomId) - progress >= 20) alerts.push('A2')
  const recent = [...student.checkIns].sort((a, b) => a.date.localeCompare(b.date)).slice(-3)
  if (
    recent.length === 3 &&
    ((recent[0].value > recent[1].value && recent[1].value > recent[2].value) ||
      recent.reduce((sum, item) => sum + item.value, 0) / 3 <= 2)
  )
    alerts.push('A3')
  if (getPendingReviewRecords(state, student).length) alerts.push('A4')
  const act12Complete = student.progress.some(
    (entry) => entry.activityId === 'act-12' && entry.status === 'COMPLETADA',
  )
  if (act12Complete) {
    const active = student.interests.filter((interest) => interest.status === 'ACTIVO')
    const latest = active
      .map((interest) => interest.addedAt)
      .sort()
      .at(-1)
    if (active.length <= 1 || !latest || daysBetween(now, latest) >= 14) alerts.push('A5')
  }
  if (
    !student.guardian ||
    getFamilyActivityRows(state, student).some(
      (entry) =>
        entry.activatedAt && entry.status !== 'COMPLETADA' && daysBetween(now, entry.activatedAt) > 10,
    )
  )
    alerts.push('A6')
  return alerts
}

export function getTrafficLight(alerts: AlertCode[]): TrafficLight {
  if (alerts.includes('A3') || alerts.length >= 2) return 'priority'
  if (alerts.length === 1) return 'attention'
  return 'on-track'
}

export function getAlertExplanation(state: CounselorPortalState, student: Student, code: AlertCode) {
  const explanations: Record<AlertCode, string> = {
    A1: `No ingresa a la plataforma desde hace más de ${daysBetween(state.referenceDate, student.lastAccess)} días.`,
    A2: 'Su avance en registros prioritarios está por debajo de la media del salón.',
    A3: 'Su nivel de seguridad ha disminuido en los últimos check-ins.',
    A4: 'Tiene registros observados pendientes de atención.',
    A5: 'Mantiene una exploración de intereses limitada o sin actividad reciente.',
    A6: student.guardian
      ? 'Tiene actividades familiares pendientes desde hace varios días.'
      : 'No tiene un apoderado registrado.',
  }
  return explanations[code]
}

export function getCurrentActivity(state: CounselorPortalState, student: Student) {
  const sequential = state.activities
    .filter((activity) => activity.sequential && activity.participant === 'ESTUDIANTE')
    .sort((a, b) => a.order - b.order)
  return (
    sequential.find(
      (activity) =>
        !student.progress.some((entry) => entry.activityId === activity.id && entry.status === 'COMPLETADA'),
    ) ?? sequential.at(-1)
  )
}

export function isCardComplete(interest: Interest) {
  const card = interest.card
  return Boolean(
    card?.motivation?.trim() &&
    card.influences.length &&
    card.knowledge?.trim() &&
    card.preparations.length &&
    card.budgets.length,
  )
}

export function getCardParts(interest: Interest) {
  const card = interest.card
  return [
    Boolean(card?.motivation?.trim()),
    Boolean(card?.influences.length),
    Boolean(card?.knowledge?.trim()),
    Boolean(card?.preparations.length),
    Boolean(card?.budgets.length),
  ]
}

export function getInterestCounts(student: Student) {
  const active = student.interests.filter((interest) => interest.status === 'ACTIVO')
  const careers = active.filter((interest) => interest.type === 'CARRERA')
  const occupations = active.filter((interest) => interest.type === 'OCUPACION')
  return {
    careers: careers.length,
    occupations: occupations.length,
    institutions: student.institutions.length,
    completeCards: careers.filter(isCardComplete).length,
  }
}

export function getInterestTimeline(student: Student) {
  const events = [
    ...student.interests.flatMap((interest) => [
      { date: interest.addedAt, type: interest.type as 'CARRERA' | 'OCUPACION' | 'INSTITUCION', delta: 1 },
      ...(interest.discardedAt ? [{ date: interest.discardedAt, type: interest.type, delta: -1 }] : []),
    ]),
    ...student.institutions.map((institution) => ({
      date: institution.addedAt,
      type: 'INSTITUCION' as const,
      delta: 1,
    })),
  ].sort((a, b) => a.date.localeCompare(b.date))
  let careers = 0
  let occupations = 0
  let institutions = 0
  return events.map((event) => {
    if (event.type === 'CARRERA') careers += event.delta
    else if (event.type === 'OCUPACION') occupations += event.delta
    else institutions += event.delta
    return { date: event.date, careers, occupations, institutions }
  })
}

function getApplication(student: Student, moment: PerceptionApplication['moment']) {
  return student.perceptions.find((application) => application.moment === moment)
}

export function getTagIndicator(
  state: CounselorPortalState,
  student: Student,
  tagId: string,
  moment: PerceptionApplication['moment'],
) {
  const application = getApplication(student, moment)
  if (!application) return undefined
  const values = state.perceptionItems
    .filter((item) => item.tagIds.includes(tagId) && item.direction !== 'NEUTRA')
    .map((item) => {
      const value = application.answers[item.id]
      return value === undefined ? undefined : item.direction === 'INVERSA' ? 6 - value : value
    })
    .filter((value): value is number => value !== undefined)
  if (!values.length) return undefined
  return values.reduce((sum, value) => sum + value, 0) / values.length
}

export function getStudentTagRows(state: CounselorPortalState, student: Student) {
  return state.tags.map((tag) => {
    const entry = getTagIndicator(state, student, tag.id, 'ENTRADA')
    const exit = getTagIndicator(state, student, tag.id, 'SALIDA')
    return { tag, entry, exit, delta: entry !== undefined && exit !== undefined ? exit - entry : undefined }
  })
}

export function getCohortTagRows(state: CounselorPortalState, classroomId = 'all') {
  const students = state.students.filter(
    (student) => classroomId === 'all' || student.classroomId === classroomId,
  )
  return state.tags.map((tag) => {
    const entries = students
      .map((student) => getTagIndicator(state, student, tag.id, 'ENTRADA'))
      .filter((value): value is number => value !== undefined)
    const exits = students
      .map((student) => getTagIndicator(state, student, tag.id, 'SALIDA'))
      .filter((value): value is number => value !== undefined)
    const paired = students
      .map((student) => ({
        entry: getTagIndicator(state, student, tag.id, 'ENTRADA'),
        exit: getTagIndicator(state, student, tag.id, 'SALIDA'),
      }))
      .filter(
        (row): row is { entry: number; exit: number } => row.entry !== undefined && row.exit !== undefined,
      )
    const entry = entries.length ? entries.reduce((sum, value) => sum + value, 0) / entries.length : undefined
    const exit = exits.length ? exits.reduce((sum, value) => sum + value, 0) / exits.length : undefined
    return {
      tag,
      entry,
      exit,
      delta: entry !== undefined && exit !== undefined ? exit - entry : undefined,
      improvedPercent: paired.length
        ? Math.round((paired.filter((row) => row.exit > row.entry).length / paired.length) * 100)
        : undefined,
    }
  })
}

export function getBlockProgress(state: CounselorPortalState, students = state.students) {
  const priority = getPriorityActivities(state)
  return [...new Set(priority.map((activity) => activity.block))].map((block) => {
    const blockActivities = priority.filter((activity) => activity.block === block)
    const values: number[] = students.flatMap((student) =>
      blockActivities.map((activity) =>
        student.progress.some((entry) => entry.activityId === activity.id && entry.status === 'COMPLETADA')
          ? 1
          : 0,
      ),
    )
    const activityRates = blockActivities.map((activity) => ({
      activity,
      rate:
        students.filter((student) =>
          student.progress.some((entry) => entry.activityId === activity.id && entry.status === 'COMPLETADA'),
        ).length / Math.max(students.length, 1),
    }))
    return {
      block,
      percent: values.length
        ? Math.round((values.reduce((sum, value) => sum + value, 0) / values.length) * 100)
        : 0,
      bottleneck: activityRates.sort((a, b) => a.rate - b.rate)[0]?.activity,
    }
  })
}

export function formatRelative(date: string, now: string) {
  const days = daysBetween(now, date)
  if (days <= 0) return 'Hoy'
  if (days === 1) return 'Ayer'
  return `Hace ${days} días`
}

export function getActivity(state: CounselorPortalState, id: string): Activity | undefined {
  return state.activities.find((activity) => activity.id === id)
}
