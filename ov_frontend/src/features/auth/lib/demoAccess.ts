import { useSyncExternalStore } from 'react'

const sessionKey = 'ov.demo-access.v1'
function readSession() {
  try {
    return typeof window !== 'undefined' && window.sessionStorage.getItem(sessionKey) === '1'
  } catch {
    return false
  }
}
let active = readSession()
const listeners = new Set<() => void>()
function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}
function setAccess(next: boolean) {
  active = next
  try {
    if (next) window.sessionStorage.setItem(sessionKey, '1')
    else window.sessionStorage.removeItem(sessionKey)
  } catch {
    // Access remains available in memory when browser storage is unavailable.
  }
  listeners.forEach((listener) => listener())
}
export const startDemoAccess = () => setAccess(true)
export const endDemoAccess = () => setAccess(false)
export function useDemoAccess() {
  return useSyncExternalStore(
    subscribe,
    () => active,
    () => false,
  )
}
