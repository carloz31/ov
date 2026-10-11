import { activities, finalActivity } from '@/data/activities/content'
import type { JourneyState } from '@/types/activities'
import { fieldMissions, cityCases } from '@/data/content/adventure'
import { getActivityPrompt } from '@/data/content/journalPrompts'
import type { AdventureState } from '@/types/adventure'

export type LumiSuggestion = { activityId: string; title: string; prompt: string; tags: string[] }
const legacyActivityIds: Record<string, string> = {
  welcome: 'mission-welcome',
  story: 'mission-story',
  future: 'mission-future',
  beliefs: 'enc-mitos',
  pregones: 'act-07',
  compass: 'mission-compass',
  plan: 'act-06',
  expectations: 'mission-expectations',
  'next-step': 'mission-next-step',
}

export function getLumiTags(activityId: string) {
  const id = legacyActivityIds[activityId] ?? activityId
  if (id.startsWith('family-')) return ['familia', 'conversación']
  if (id.startsWith('case-')) return ['exploración', 'experiencia']
  if (id.startsWith('act-tip-') || id === 'inst-mara') return ['autoconocimiento', 'intereses']
  if (id === 'enc-mitos' || id === 'act-07') return ['creencias', 'decisiones']
  if (id === 'mission-story' || id === 'reg-linea-tiempo') return ['mi historia', 'autoconocimiento']
  if (id === 'mission-future' || id === 'act-06' || id === 'mission-next-step')
    return ['mi futuro', 'próximos pasos']
  if (id === 'mission-expectations') return ['expectativas', 'familia']
  return ['actividad', 'autoconocimiento']
}

export function getLumiSuggestions(state: AdventureState, journey: JourneyState): LumiSuggestion[] {
  const suggestions = new Map<string, LumiSuggestion>()
  const completedLegacy = new Set(state.completedMissionIds.map((id) => legacyActivityIds[id] ?? id))
  for (const activity of [...activities, finalActivity]) {
    if (journey.progress[activity.id]?.estado !== 'completada' && !completedLegacy.has(activity.id)) continue
    suggestions.set(activity.id, {
      activityId: activity.id,
      title: activity.titulo,
      prompt: activity.promptDiario ?? getActivityPrompt(activity.id, state.readinessCheckIns),
      tags: getLumiTags(activity.id),
    })
  }
  for (const mission of fieldMissions) {
    const id = legacyActivityIds[mission.id] ?? mission.id
    if (!state.completedMissionIds.includes(mission.id) || suggestions.has(id)) continue
    suggestions.set(id, {
      activityId: id,
      title: mission.title,
      prompt: getActivityPrompt(id, state.readinessCheckIns),
      tags: getLumiTags(id),
    })
  }
  for (const item of cityCases) {
    if (!state.solvedCaseIds.includes(item.id)) continue
    const id = `case-${item.id}`
    suggestions.set(id, {
      activityId: id,
      title: item.title,
      prompt: `Después de resolver “${item.title}”, ¿qué descubriste sobre ti y las profesiones que exploraste?`,
      tags: getLumiTags(id),
    })
  }
  const answered = new Set(
    state.journal.map((entry) => legacyActivityIds[entry.linkedActivityId ?? ''] ?? entry.linkedActivityId),
  )
  return [...suggestions.values()].filter((item) => !answered.has(item.activityId))
}
