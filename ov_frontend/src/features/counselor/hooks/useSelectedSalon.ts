import { useEffect } from 'react'
import { useSearchParams } from 'react-router'
import { studentProfiles } from '@/data/demo/studentProfiles'
import { resolveSalon } from '../lib/classroomSelectors'

const storageKey = 'ov.staff.selected-salon.v1'
let rememberedSalon: string | null = null
export const assignedSalons = [...new Set(studentProfiles.map((s) => s.salon))]
function storedSalon() {
  try {
    return sessionStorage.getItem(storageKey) ?? rememberedSalon
  } catch {
    return rememberedSalon
  }
}
export function useSelectedSalon() {
  const [params, setParams] = useSearchParams()
  const requested = params.get('salon')
  const salon = resolveSalon(requested, storedSalon(), assignedSalons)
  useEffect(() => {
    rememberedSalon = salon
    try {
      sessionStorage.setItem(storageKey, salon)
    } catch {
      /* The URL remains usable without storage. */
    }
    if (requested === null || requested !== salon) {
      const next = new URLSearchParams(params)
      next.set('salon', salon)
      setParams(next, { replace: true })
    }
  }, [salon, requested, params, setParams])
  const setSalon = (value: string) => {
    const next = new URLSearchParams(params)
    next.set('salon', resolveSalon(value, null, assignedSalons))
    setParams(next)
  }
  return { salon, setSalon, salons: assignedSalons }
}
