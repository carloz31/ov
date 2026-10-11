import { getLumiBond } from '@/features/journal/lib/lumiBond'
import { lumiMemories } from '@/features/journal/data/lumiMemories'
import { catalog } from '@/data/activities/content'
import type { JourneyState } from '@/types/activities'
import { getStudentAchievementGroups } from '@/features/discovery/lib/passport'
import { isCityUnlocked, isFamilyUnlocked } from '@/store/adventureStore'
import {
  getTravelResources,
  isTravelResourceUnlocked,
} from '@/features/backpack/lib/travelerResources'
import type { AdventureState } from '@/types/adventure'
import { appPaths } from '@/routes/paths'
import type { StudentDiscoveryState } from '@/types/discovery'
import type { StudentUiState } from '@/store/studentUiStore'

export type UnlockItem = {
  id: string
  kind: 'badge' | 'ficha' | 'heroe' | 'ciudad' | 'familia' | 'plan' | 'memory'
  title: string
  description?: string
  href: string
}

export function getEarnedBadges(adventure: AdventureState, journey?: JourneyState) {
  return getStudentAchievementGroups(adventure, journey)
    .flatMap((group) => group.items)
    .filter((badge) => badge.done)
}

export function getUnlocks(
  adventure: AdventureState,
  journey: JourneyState,
  discovery?: StudentDiscoveryState,
): UnlockItem[] {
  return [
    ...lumiMemories
      .slice(0, getLumiBond(adventure.lumiRegistrations).memoriesOpened)
      .map((memory, index): UnlockItem => ({
        id: `lumi-memory:${index + 1}`,
        kind: 'memory',
        title: 'Lumi recordó algo nuevo',
        description: `Recuerdo ${index + 1}: ${memory.title}`,
        href: `${appPaths.student.journal}?memory=${index + 1}`,
      })),
    ...(discovery?.revealedPages ?? []).map((id): UnlockItem => ({
      id: `plans:${id}`,
      kind: 'plan',
      title: 'Revisa tus planes',
      description: `Página de ${id} descifrada. Un nuevo descubrimiento puede abrir otra ruta.`,
      href: appPaths.student.decisions,
    })),
    ...getEarnedBadges(adventure, journey).map((badge): UnlockItem => ({
      id: `badge:${badge.code}`,
      kind: 'badge',
      title: badge.title,
      href: appPaths.student.passport,
    })),
    ...[...new Set(journey.resources)].flatMap((id) => {
      const resource = catalog.recursos.find((resource) => resource.id === id)
      return resource
        ? [
            {
              id: `ficha:${id}`,
              kind: 'ficha' as const,
              title: resource.titulo,
              href: appPaths.student.resources,
            },
          ]
        : []
    }),
    ...getTravelResources()
      .filter(
        (resource) =>
          resource.kind === 'testimonial' && isTravelResourceUnlocked(resource, journey, adventure),
      )
      .map((resource): UnlockItem => ({
        id: `heroe:${resource.id}`,
        kind: 'heroe',
        title: resource.title,
        href: appPaths.student.testimonials,
      })),
    ...(isCityUnlocked(adventure)
      ? [
          {
            id: 'ciudad',
            kind: 'ciudad' as const,
            title: 'La ciudad te espera',
            href: appPaths.student.exploration,
          },
        ]
      : []),
    ...(isFamilyUnlocked(adventure)
      ? [
          {
            id: 'familia',
            kind: 'familia' as const,
            title: 'Conversaciones en familia',
            href: appPaths.student.conversations,
          },
        ]
      : []),
  ]
}

export function seedStudentUnlocks(
  ui: StudentUiState,
  adventure: AdventureState,
  journey: JourneyState,
): StudentUiState {
  if (ui.initialized) return ui
  return {
    ...ui,
    initialized: true,
    seenUnlockIds: [
      ...new Set([
        ...ui.seenUnlockIds,
        ...getUnlocks(adventure, journey)
          .filter((item) => item.kind !== 'memory')
          .map((item) => item.id),
      ]),
    ],
    announcedBadgeCodes: [
      ...new Set([
        ...ui.announcedBadgeCodes,
        ...getEarnedBadges(adventure, journey).map((badge) => badge.code),
      ]),
    ],
  }
}

export function orderUnlocks(items: UnlockItem[], ui: StudentUiState) {
  const seen = new Set(ui.seenUnlockIds)
  return [...items].sort((a, b) => Number(seen.has(a.id)) - Number(seen.has(b.id)))
}

export function markUnlocksSeen(ui: StudentUiState, items: UnlockItem[]): StudentUiState {
  const ids = items.map((item) => item.id)
  if (ids.every((id) => ui.seenUnlockIds.includes(id))) return ui
  return { ...ui, seenUnlockIds: [...new Set([...ui.seenUnlockIds, ...ids])] }
}

export function markBadgeAnnounced(ui: StudentUiState, code: string): StudentUiState {
  return ui.announcedBadgeCodes.includes(code)
    ? ui
    : { ...ui, announcedBadgeCodes: [...ui.announcedBadgeCodes, code] }
}

export function getNextBadge(
  adventure: AdventureState,
  ui: StudentUiState,
  activityOpen: boolean,
  overlayOpen: boolean,
  journey?: JourneyState,
) {
  if (!ui.initialized || activityOpen || overlayOpen) return undefined
  return getEarnedBadges(adventure, journey).find((badge) => !ui.announcedBadgeCodes.includes(badge.code))
}
