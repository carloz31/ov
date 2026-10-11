import { useEffect, useRef } from 'react'

import { useLocation, useSearchParams } from 'react-router'

import { activities } from '@/data/demo/studentProfiles'
import { usePriorityCatalog } from '@/features/counselor/hooks/usePrioritySettings'
import { generalProgress, priorityProgress } from '@/features/student-tracking/lib/selectors'
import { profileSections, safeReturnTo } from '@/features/student-tracking/lib/navigation'

import type { StudentProfile } from '@/types/studentProfile'

export function useTrackingProfile(student: StudentProfile) {
  const mainRef = useRef<HTMLElement>(null)
  const [params, setParams] = useSearchParams()
  const location = useLocation()
  const returnTo = safeReturnTo(params.get('returnTo'))
  const requested = params.get('section')
  const section = profileSections.some((s) => s.id === requested) ? requested! : 'summary'
  const attention = params.get('review') === 'attention'
  useEffect(() => {
    if (!location.hash) mainRef.current?.scrollIntoView({ block: 'start' })
  }, [student.id, location.hash])
  useEffect(() => {
    if (location.hash)
      document.getElementById(location.hash.slice(1))?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }, [location.hash, section])
  const setSection = (value: string) => {
    const next = new URLSearchParams(params)
    next.set('section', value)
    next.delete('review')
    setParams(next)
  }
  const configured = usePriorityCatalog()
  const priority = priorityProgress(student, configured.activities, configured.questionnaires)
  const general = generalProgress(student, activities)
  return { mainRef, returnTo, section, attention, setSection, priority, general }
}
