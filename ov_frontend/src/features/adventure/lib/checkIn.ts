import { useEffect, useState } from 'react'
import { updateAdventure } from '@/store/adventureStore'
import { lumiDayKey } from '@/lib/lumiFriendship'
import type { AdventureState, ReadinessCheckIn } from '@/types/adventure'

// Use the journal's Lima calendar and preserve the original registration when editing.
export const localDateKey = lumiDayKey

export function getTodayCheckIn(state: Pick<AdventureState, 'readinessCheckIns'>, now = new Date()) {
  const today = localDateKey(now)
  return state.readinessCheckIns.find(
    (checkIn) =>
      checkIn.linkedActivityId === 'daily-check-in' &&
      Number.isFinite(Date.parse(checkIn.createdAt)) &&
      localDateKey(new Date(checkIn.createdAt)) === today,
  )
}

export function saveTodayCheckIn(value: ReadinessCheckIn['value']) {
  if (!Number.isInteger(value) || value < 1 || value > 10) return
  updateAdventure((current) => {
    const now = new Date()
    const existing = getTodayCheckIn(current, now)
    const checkIn: ReadinessCheckIn = {
      id: existing?.id ?? crypto.randomUUID(),
      createdAt: existing?.createdAt ?? now.toISOString(),
      linkedActivityId: 'daily-check-in',
      value,
    }
    return {
      ...current,
      readinessCheckIns: [...current.readinessCheckIns.filter((item) => item.id !== checkIn.id), checkIn],
    }
  })
}

export function useCheckInDay() {
  const [today, setToday] = useState(() => localDateKey(new Date()))
  useEffect(() => {
    const refresh = () => setToday(localDateKey(new Date()))
    const onVisible = () => {
      if (document.visibilityState === 'visible') refresh()
    }
    const timer = window.setInterval(refresh, 60000)
    window.addEventListener('focus', refresh)
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      window.clearInterval(timer)
      window.removeEventListener('focus', refresh)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [])
  return today
}
