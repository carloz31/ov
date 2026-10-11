import { useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router'

import { studentProfiles } from '@/data/demo/studentProfiles'

import { useCounselorPortal } from '@/features/counselor/context/counselorPortalContext'

export function useStudentDetail() {
  const { state, dispatch } = useCounselorPortal()
  const navigate = useNavigate()
  const { studentId } = useParams()
  const [params, setParams] = useSearchParams()
  const student = state.students.find((item) => item.id === studentId)
  const [observationOpen, setObservationOpen] = useState(false)
  const [removeObservationOpen, setRemoveObservationOpen] = useState(false)
  const [observationReason, setObservationReason] = useState('')
  const exampleStudent = studentProfiles.find((item) => item.id === studentId)
  return {
    state,
    dispatch,
    navigate,
    studentId,
    params,
    setParams,
    student,
    observationOpen,
    setObservationOpen,
    removeObservationOpen,
    setRemoveObservationOpen,
    observationReason,
    setObservationReason,
    exampleStudent,
  }
}
