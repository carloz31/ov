import { useSyncExternalStore } from 'react'

export const isRecord = (value: unknown): value is Record<string, unknown> =>
  !!value && typeof value === 'object' && !Array.isArray(value)
export const isStrings = (value: unknown): value is string[] =>
  Array.isArray(value) && value.every((item) => typeof item === 'string')
export const isIso = (value: unknown): value is string =>
  typeof value === 'string' && Number.isFinite(Date.parse(value))

export function persistentStore<T>(
  key: string,
  initial: () => T,
  valid: (value: unknown) => value is T,
  normalize: (value: unknown) => unknown = (value) => value,
) {
  let error = false
  const read = () => {
    try {
      const value: unknown = normalize(JSON.parse(localStorage.getItem(key) ?? 'null'))
      return valid(value) ? value : initial()
    } catch {
      return initial()
    }
  }
  let state = read()
  const listeners = new Set<() => void>()
  const subscribe = (listener: () => void) => {
    listeners.add(listener)
    return () => {
      listeners.delete(listener)
    }
  }
  const notify = () => listeners.forEach((listener) => listener())
  if (typeof window !== 'undefined')
    window.addEventListener('storage', (event) => {
      if (event.key !== key && event.key !== null) return
      state = read()
      error = false
      notify()
    })
  return {
    getSnapshot: () => state,
    useState: () =>
      useSyncExternalStore(
        subscribe,
        () => state,
        () => state,
      ),
    useError: () =>
      useSyncExternalStore(
        subscribe,
        () => error,
        () => false,
      ),
    update: (transform: (current: T) => T) => {
      const next = transform(state)
      if (next === state) return
      if (!valid(next)) throw new Error(`Estado inválido para ${key}`)
      state = next
      try {
        localStorage.setItem(key, JSON.stringify(state))
        error = false
      } catch {
        error = true
      }
      notify()
    },
  }
}
