import { useSearchParams } from 'react-router'

import { blocks, profileCatalog, studentProfiles } from '@/data/demo/studentProfiles'

import { usePriorityCatalog } from '@/features/counselor/hooks/usePrioritySettings'
import { classroomSummary } from '@/features/counselor/lib/classroomSelectors'
import { useSelectedSalon } from '@/features/counselor/hooks/useSelectedSalon'

export function useCounselorDashboard() {
  const { salon, setSalon, salons } = useSelectedSalon()
  const [params, setParams] = useSearchParams()
  const section = params.get('section') === 'interests' ? 'interests' : 'tracking'
  const setSection = (value: string) => {
    const next = new URLSearchParams(params)
    next.set('section', value)
    next.set('salon', salon)
    setParams(next)
  }
  const { activities, questionnaires } = usePriorityCatalog()
  const students = studentProfiles.filter((student) => salon === 'all' || student.salon === salon)
  const summary = classroomSummary(
    students,
    studentProfiles,
    activities,
    questionnaires,
    blocks,
    profileCatalog,
  )
  const listUrl = `/counselor/students?${new URLSearchParams({ salon })}`
  const ratio = (count: number) => (summary.total ? (count / summary.total) * 100 : 0)
  const questionRows = summary.questionnaires.filter((row) => row.definition.priority)
  const recordRows = summary.records.filter((row) => row.activity.priority)
  const descent = summary.security.trends.find((row) => row.label === 'En descenso')!.count
  return {
    salon,
    setSalon,
    salons,
    section,
    setSection,
    summary,
    listUrl,
    ratio,
    questionRows,
    recordRows,
    descent,
  }
}
