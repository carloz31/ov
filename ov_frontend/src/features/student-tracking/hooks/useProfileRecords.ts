import { useState } from 'react'

import { activities } from '@/data/demo/studentProfiles'
import { usePriorityCatalog } from '@/features/counselor/hooks/usePrioritySettings'
import { normalizeSearch, observationCounts } from '@/features/student-tracking/lib/selectors'

import type { StudentProfile } from '@/types/studentProfile'

export function useProfileRecords(student: StudentProfile, attention: boolean) {
  const [filter, setFilter] = useState(attention ? 'all' : 'priority')
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState<string[]>(
    attention
      ? activities
          .filter((a) => a.kind === 'record' && observationCounts(student, a.id).attention > 0)
          .map((a) => a.id)
      : [],
  )
  const configured = usePriorityCatalog()
  const all = configured.activities.filter((a) => a.kind === 'record')
  const priority = all.filter((a) => a.priority)
  const selected = filter === 'priority' ? priority : all
  const visible = selected.filter((a) => normalizeSearch(a.title).includes(normalizeSearch(query)))
  const started = student.activities.some(
    (entry) => all.some((a) => a.id === entry.activityId) && entry.state !== 'not-started',
  )
  return { filter, setFilter, query, setQuery, open, setOpen, all, priority, visible, started }
}
