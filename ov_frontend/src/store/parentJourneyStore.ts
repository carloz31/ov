import { useSyncExternalStore } from 'react'
import { initialJourney } from '@/lib/activities/logic'
import type { JourneyState } from '@/types/activities'

export const parentAccountId = 'apo-prototipo'
const storageKey = 'ov.parent-missions.v1'
type ParentMissions = { version: 1; accounts: Record<string, JourneyState> }
const empty = (): ParentMissions => ({ version: 1, accounts: {} })
function read(): ParentMissions {
  try {
    const value = JSON.parse(localStorage.getItem(storageKey) ?? 'null')
    if (
      value?.version !== 1 ||
      !value.accounts ||
      typeof value.accounts !== 'object' ||
      Array.isArray(value.accounts)
    )
      return empty()
    const accounts: Record<string, JourneyState> = {}
    for (const [accountId, candidate] of Object.entries(value.accounts)) {
      const journey = candidate as JourneyState
      const base = initialJourney()
      if (
        !journey ||
        journey.version !== 2 ||
        Object.keys(base).some(
          (key) =>
            Array.isArray(base[key as keyof JourneyState]) &&
            !Array.isArray(journey[key as keyof JourneyState]),
        )
      )
        continue
      if (
        !journey.progress ||
        Array.isArray(journey.progress) ||
        typeof journey.progress !== 'object' ||
        !journey.drafts ||
        Array.isArray(journey.drafts) ||
        typeof journey.drafts !== 'object'
      )
        continue
      if (
        [...Object.values(journey.progress), ...journey.attempts, ...journey.choices].some(
          (record) => !record || record.estudianteId !== accountId,
        )
      )
        continue
      accounts[accountId] = { ...base, ...journey }
    }
    return { version: 1, accounts }
  } catch {
    return empty()
  }
}
let state = read()
let error = ''
const defaults = new Map<string, JourneyState>()
const listeners = new Set<() => void>()
function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}
export function getParentJourney(accountId = parentAccountId): JourneyState {
  if (state.accounts[accountId]) return state.accounts[accountId]
  if (!defaults.has(accountId)) defaults.set(accountId, initialJourney())
  return defaults.get(accountId)!
}
export function updateParentJourney(
  update: (current: JourneyState) => JourneyState,
  accountId = parentAccountId,
) {
  const next = update(getParentJourney(accountId))
  try {
    // Preserve other accounts written by another tab since our last snapshot.
    const persisted = {
      version: 1 as const,
      accounts: { ...state.accounts, ...read().accounts, [accountId]: next },
    }
    localStorage.setItem(storageKey, JSON.stringify(persisted))
    state = persisted
    error = ''
  } catch {
    error = 'No se pudo guardar. Libere espacio o permita el almacenamiento y vuelva a intentarlo.'
  }
  listeners.forEach((listener) => listener())
  return !error
}
export const useParentJourney = (accountId = parentAccountId) =>
  useSyncExternalStore(subscribe, () => getParentJourney(accountId))
export function hidratarParentJourney(
  cuenta: string,
  transformar: (actual: JourneyState) => JourneyState,
) {
  return updateParentJourney(transformar, cuenta)
}
export const useParentJourneyError = () => useSyncExternalStore(subscribe, () => error)
window.addEventListener('storage', (event: StorageEvent) => {
  if (event.key === storageKey || event.key === null) {
    state = read()
    error = ''
    listeners.forEach((listener) => listener())
  }
})
