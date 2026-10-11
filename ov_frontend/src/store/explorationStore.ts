import type { SetStateAction } from 'react'
import { forestFireProfessionals } from '@/data/content/forestFireCase'
import { mockOccupationProfiles } from '@/data/catalog/occupations'
import type { OccupationProfile } from '@/types/catalog'
import type { DecisionSheet } from '@/types/decisions'
import { isIso, isRecord, isStrings, persistentStore } from '@/lib/persistentStore'

export type StudentExplorationState = {
  version: 1
  forestFireIconsVersion?: 2
  profiles: OccupationProfile[]
  careerInterestIds: string[]
  institutionInterestIds: string[]
  decisionSheets: DecisionSheet[]
}
export const initialExplorationState = (): StudentExplorationState => ({
  version: 1,
  forestFireIconsVersion: 2,
  profiles: mockOccupationProfiles.map((p) => ({
    ...p,
    discoveryState: forestFireProfessionals.some((f) => f.occupationId === p.occupationId)
      ? 'unused'
      : p.discoveryState,
  })),
  careerInterestIds: [],
  institutionInterestIds: [],
  decisionSheets: [],
})
export function validExplorationState(v: unknown): v is StudentExplorationState {
  return (
    isRecord(v) &&
    v.version === 1 &&
    isStrings(v.careerInterestIds) &&
    isStrings(v.institutionInterestIds) &&
    Array.isArray(v.profiles) &&
    v.profiles.every(
      (p) =>
        isRecord(p) &&
        typeof p.occupationId === 'string' &&
        ['unused', 'unlocked', 'explored'].includes(String(p.discoveryState)) &&
        typeof p.interested === 'boolean',
    ) &&
    Array.isArray(v.decisionSheets) &&
    v.decisionSheets.every((s) => {
      if (
        !isRecord(s) ||
        !['active', 'favorite', 'archived'].includes(String(s.status)) ||
        !isIso(s.createdAt) ||
        (s.sourceId !== undefined && typeof s.sourceId !== 'string')
      )
        return false
      if (
        ![
          'id',
          'name',
          'interestedSince',
          'motivation',
          'optionQuality',
          'knowledge',
          'dailyWork',
          'fit',
          'selfKnowledge',
          'selfKnowledgeNote',
          'strengths',
          'challenges',
          'interviewFindings',
          'researchFindings',
        ].every((key) => typeof s[key] === 'string')
      )
        return false
      return (
        ['noInfluence', 'interviewed', 'researched'].every((key) => typeof s[key] === 'boolean') &&
        isStrings(s.preparation) &&
        isStrings(s.customPreparation) &&
        Array.isArray(s.influences) &&
        s.influences.every(
          (i) => isRecord(i) && ['id', 'person', 'description'].every((key) => typeof i[key] === 'string'),
        ) &&
        Array.isArray(s.budgets) &&
        s.budgets.every(
          (b) =>
            isRecord(b) &&
            [
              'id',
              'label',
              'name',
              'modality',
              'city',
              'duration',
              'housing',
              'enrollmentCost',
              'tuitionCost',
              'materialsCost',
              'monthlyLivingCost',
              'academyMonths',
              'academyCost',
              'scholarshipNote',
            ].every((key) => typeof b[key] === 'string') &&
            typeof b.scholarship === 'boolean',
        ) &&
        Array.isArray(s.timeline) &&
        s.timeline.every(
          (e) =>
            isRecord(e) &&
            typeof e.id === 'string' &&
            isIso(e.date) &&
            ['created', 'certainty', 'favorite', 'archived', 'reactivated', 'reconfirmed'].includes(
              String(e.type),
            ),
        )
      )
    })
  )
}
export function normalizeForestFireIcons(value: unknown): unknown {
  if (!isRecord(value) || value.forestFireIconsVersion === 2 || !Array.isArray(value.profiles)) return value
  return {
    ...value,
    forestFireIconsVersion: 2,
    profiles: value.profiles.map((p) =>
      isRecord(p) && forestFireProfessionals.some((f) => f.occupationId === p.occupationId)
        ? { ...p, discoveryState: 'unused' }
        : p,
    ),
  }
}
const store = persistentStore(
  'ov.student-exploration.v1',
  initialExplorationState,
  validExplorationState,
  normalizeForestFireIcons,
)
// Persist the one-time migration even before the student makes another change.
try {
  const saved = JSON.parse(localStorage.getItem('ov.student-exploration.v1') ?? 'null')
  if (saved?.version === 1 && saved.forestFireIconsVersion !== 2) store.update((s) => ({ ...s }))
} catch {
  /* The store keeps an in-memory state if storage is unavailable. */
}
export function unlockCaseOccupations(ids: string[]) {
  const uniqueIds = [
    ...new Set(ids.filter((id) => forestFireProfessionals.some((p) => p.occupationId === id))),
  ]
  const current = store.getSnapshot()
  const newIds = uniqueIds.filter(
    (id) => !current.profiles.some((p) => p.occupationId === id && p.discoveryState !== 'unused'),
  )
  if (newIds.length)
    store.update((s) => ({
      ...s,
      profiles: [
        ...s.profiles.map((p) =>
          newIds.includes(p.occupationId) ? { ...p, discoveryState: 'unlocked' as const } : p,
        ),
        ...newIds
          .filter((id) => !s.profiles.some((p) => p.occupationId === id))
          .map((occupationId) => ({ occupationId, discoveryState: 'unlocked' as const, interested: false })),
      ],
    }))
  return newIds
}
export const useExploration = store.useState
export const useExplorationError = store.useError
export const updateExploration = store.update
export const getExploration = store.getSnapshot
export function setDecisionSheets(action: SetStateAction<DecisionSheet[]>) {
  updateExploration((s) => ({
    ...s,
    decisionSheets: typeof action === 'function' ? action(s.decisionSheets) : action,
  }))
}
const toggle = (ids: string[], id: string) => (ids.includes(id) ? ids.filter((v) => v !== id) : [...ids, id])
export const toggleCareerInterest = (id: string) =>
  updateExploration((s) => ({ ...s, careerInterestIds: toggle(s.careerInterestIds, id) }))
export const toggleInstitutionInterest = (id: string) =>
  updateExploration((s) => ({ ...s, institutionInterestIds: toggle(s.institutionInterestIds, id) }))
export function toggleOccupationInterest(id: string) {
  updateExploration((s) => ({
    ...s,
    profiles: s.profiles.some((p) => p.occupationId === id)
      ? s.profiles.map((p) => (p.occupationId === id ? { ...p, interested: !p.interested } : p))
      : [...s.profiles, { occupationId: id, interested: true, discoveryState: 'unused' }],
  }))
}
