import { useEffect, useState } from 'react'

// Refresh at day boundaries and on returning to the tab; also use a fresh clock on store updates.
export function useLumiNow() {
  const [, setTick] = useState(0)
  useEffect(() => {
    const refresh = () => setTick((value) => value + 1)
    const timer = window.setInterval(refresh, 60000)
    window.addEventListener('focus', refresh)
    return () => {
      window.clearInterval(timer)
      window.removeEventListener('focus', refresh)
    }
  }, [])
  return new Date()
}
