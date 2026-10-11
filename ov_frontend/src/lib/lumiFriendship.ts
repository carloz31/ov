import type { JournalEntry } from '@/types/adventure'

export const lumiFriendshipRules = {
  timeZone: 'America/Lima',
  dailyPointLimit: 3,
  inactiveDaysPerLoss: 3,
  pointsPerLoss: 1,
} as const

export type LumiRegistration = { entryId: string; createdAt: string }

export function lumiDayKey(date: Date) {
  const parts = new Intl.DateTimeFormat('en', {
    timeZone: lumiFriendshipRules.timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date)
  const part = (type: string) => parts.find((item) => item.type === type)?.value
  return `${part('year')}-${part('month')}-${part('day')}`
}

export function normalizeLumiRegistrations(value: unknown): LumiRegistration[] {
  if (!Array.isArray(value)) return []
  const unique = new Map<string, LumiRegistration>()
  for (const item of value) {
    if (
      typeof item?.entryId === 'string' &&
      typeof item?.createdAt === 'string' &&
      Number.isFinite(Date.parse(item.createdAt)) &&
      !unique.has(item.entryId)
    ) {
      unique.set(item.entryId, { entryId: item.entryId, createdAt: item.createdAt })
    }
  }
  return [...unique.values()]
}

// Keep the ledger after deletion: editing/deleting must not reset the daily limit.
export function trackLumiEntries(
  registrations: LumiRegistration[],
  previous: JournalEntry[],
  next: JournalEntry[],
) {
  const known = new Set([...previous.map((entry) => entry.id), ...registrations.map((item) => item.entryId)])
  return normalizeLumiRegistrations([
    ...registrations,
    ...next
      .filter((entry) => !known.has(entry.id) && !entry.id.startsWith('demo-') && entry.body.trim())
      .map((entry) => ({ entryId: entry.id, createdAt: entry.createdAt })),
  ])
}

export function getLumiFriendship(registrations: LumiRegistration[], now = new Date()) {
  const today = lumiDayKey(now)
  const days = new Map<string, number>()
  for (const item of normalizeLumiRegistrations(registrations)) {
    if (Date.parse(item.createdAt) > now.getTime()) continue
    const day = lumiDayKey(new Date(item.createdAt))
    days.set(day, (days.get(day) ?? 0) + 1)
  }
  const ordinal = (day: string) => Date.parse(`${day}T00:00:00Z`) / 86400000
  const loss = (from: string, to: string) =>
    Math.floor((ordinal(to) - ordinal(from)) / lumiFriendshipRules.inactiveDaysPerLoss) *
    lumiFriendshipRules.pointsPerLoss
  let points = 0
  let lastDay: string | undefined
  for (const [day, count] of [...days.entries()].sort(([a], [b]) => a.localeCompare(b))) {
    if (lastDay) points = Math.max(0, points - loss(lastDay, day))
    points += Math.min(count, lumiFriendshipRules.dailyPointLimit)
    lastDay = day
  }
  if (lastDay) points = Math.max(0, points - loss(lastDay, today))
  const todayEarned = Math.min(days.get(today) ?? 0, lumiFriendshipRules.dailyPointLimit)
  const levels = [
    { label: 'Conociéndonos', minimum: 0 },
    { label: 'Compañeros de camino', minimum: 10 },
    { label: 'Amigos de aventuras', minimum: 25 },
    { label: 'Una gran amistad', minimum: 50 },
  ]
  const levelIndex = levels.findLastIndex((level) => points >= level.minimum)
  const level = levels[levelIndex]
  const nextLevel = levels[levelIndex + 1]
  return {
    points,
    todayEarned,
    remainingToday: lumiFriendshipRules.dailyPointLimit - todayEarned,
    level: level.label,
    nextLevelAt: nextLevel?.minimum,
    progress: nextLevel ? ((points - level.minimum) / (nextLevel.minimum - level.minimum)) * 100 : 100,
  }
}
