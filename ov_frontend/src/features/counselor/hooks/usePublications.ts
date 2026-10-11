import { useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router'

import { useAdventure } from '@/store/adventureStore'

import { interviewDetails } from '@/features/counselor/data/interviewDetails'
import { useCounselorPortal } from '@/features/counselor/context/counselorPortalContext'
import { getPublishedInterviews } from '@/features/counselor/lib/interviewSelectors'
import type { Interview } from '@/features/counselor/types'

export function usePublications() {
  const { state } = useCounselorPortal()
  const adventure = useAdventure()
  const [params, setParams] = useSearchParams()
  const { interviewId } = useParams()
  const navigate = useNavigate()
  const [confirmHide, setConfirmHide] = useState(false)
  const salon = state.classrooms.some((item) => item.id === params.get('salon'))
    ? params.get('salon')!
    : 'all'
  const query = salon === 'all' ? '' : `?salon=${encodeURIComponent(salon)}`
  const listUrl = `/counselor/publications${query}`
  const interviews = getPublishedInterviews(state.interviews, adventure)
  const visible = interviews.filter((item) => salon === 'all' || item.classroomId === salon)
  const classroom = (item: Interview) => {
    const room = state.classrooms.find((room) => room.id === item.classroomId)
    return room ? `${room.grade.split(' ')[0]} ${room.section}` : 'Sin asignar'
  }
  const profession = (item: Interview) => interviewDetails[item.videoId ?? item.id]?.career ?? item.subject
  const videoId = (item: Interview) => item.videoId ?? item.id
  const reports = (item: Interview) => adventure.reports.filter((report) => report.postId === videoId(item))
  const comments = (item: Interview) =>
    interviewDetails[videoId(item)]?.comments.filter((comment) => comment.text).length ?? 0
  const date = (item: Interview) => new Date(item.date).toLocaleDateString('es-PE')

  const headers = [
    'Autores',
    'Salón',
    'Profesión u ocupación',
    'Fecha de publicación',
    'Comentarios',
    'Estado',
    'Acciones',
  ]
  return {
    headers,
    query,
    state,
    adventure,
    setParams,
    interviewId,
    navigate,
    confirmHide,
    setConfirmHide,
    salon,
    listUrl,
    interviews,
    visible,
    classroom,
    profession,
    videoId,
    reports,
    comments,
    date,
  }
}
