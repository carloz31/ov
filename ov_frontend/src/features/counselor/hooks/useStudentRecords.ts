import { useState } from 'react'

import { getPriorityActivities, latestRecords } from '@/features/counselor/lib/counselorPortalSelectors'
import { useCounselorPortal } from '@/features/counselor/context/counselorPortalContext'
import type { Student, StudentRecord } from '@/features/counselor/types'

export function useStudentRecords(student: Student) {
  const { state, dispatch } = useCounselorPortal()
  const priorityIds = new Set(getPriorityActivities(state).map((item) => item.id))
  const records = latestRecords(student).filter((record) => priorityIds.has(record.activityId))
  const [selected, setSelected] = useState<StudentRecord>()
  const [redoRecord, setRedoRecord] = useState<StudentRecord>()
  const [comment, setComment] = useState('')
  const act = (record: StudentRecord, status: 'ACEPTADO' | 'REHACER_SUGERIDO', note?: string) =>
    dispatch({ type: 'REVIEW_RECORD', studentId: student.id, recordId: record.id, status, comment: note })
  return { state, records, selected, setSelected, redoRecord, setRedoRecord, comment, setComment, act }
}
