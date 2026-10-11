import { useEffect, useRef, useState, type PointerEvent } from 'react'
import { forestFireProfessionals } from '@/data/content/forestFireCase'
export function useProfessionalDirectory({
  selectedIds,
  budgetRemaining,
  onCall,
  onDragContact,
}: {
  selectedIds: string[]
  budgetRemaining: number
  onCall: (id: string) => void
  onDragContact: (id?: string, overTeam?: boolean) => void
}) {
  const [resumeId, setResumeId] = useState<string>()
  const [desktop, setDesktop] = useState(
    () => typeof window !== 'undefined' && (window.matchMedia?.('(min-width: 1024px)').matches ?? false),
  )
  const resumeOpener = useRef<HTMLButtonElement | null>(null)
  const backButton = useRef<HTMLButtonElement>(null)
  const drag = useRef<{ id: string; pointerId: number; x: number; y: number; moved: boolean } | undefined>(
    undefined,
  )
  const suppressClick = useRef(false)
  const [dragGhost, setDragGhost] = useState<{ id: string; x: number; y: number }>()
  const professional = forestFireProfessionals.find((p) => p.id === resumeId)
  const called = !!resumeId && selectedIds.includes(resumeId)
  useEffect(() => {
    const media = window.matchMedia('(min-width: 1024px)')
    const update = () => setDesktop(media.matches)
    media.addEventListener('change', update)
    return () => media.removeEventListener('change', update)
  }, [])
  useEffect(() => {
    if (desktop && resumeId) backButton.current?.focus()
    else if (desktop && !resumeId) resumeOpener.current?.focus()
  }, [desktop, resumeId])
  function overTeam(x: number, y: number) {
    return !!document.elementFromPoint(x, y)?.closest('.ff-team-zone')
  }
  function startDrag(event: PointerEvent<HTMLElement>, id: string) {
    if (
      !desktop ||
      event.button !== 0 ||
      selectedIds.includes(id) ||
      budgetRemaining === 0 ||
      (event.target as HTMLElement).closest('button,a')
    )
      return
    event.preventDefault()
    drag.current = { id, pointerId: event.pointerId, x: event.clientX, y: event.clientY, moved: false }
    event.currentTarget.setPointerCapture(event.pointerId)
  }
  function moveDrag(event: PointerEvent<HTMLElement>) {
    const origin = drag.current
    if (!origin || origin.pointerId !== event.pointerId) return
    origin.moved ||= Math.hypot(event.clientX - origin.x, event.clientY - origin.y) > 6
    if (origin.moved) {
      setDragGhost({ id: origin.id, x: event.clientX, y: event.clientY })
      onDragContact(origin.id, overTeam(event.clientX, event.clientY))
    }
  }
  function finishDrag(event: PointerEvent<HTMLElement>, cancelled = false) {
    const origin = drag.current
    if (!origin || origin.pointerId !== event.pointerId) return
    drag.current = undefined
    suppressClick.current = origin.moved
    if (!cancelled && origin.moved && budgetRemaining > 0 && overTeam(event.clientX, event.clientY))
      onCall(origin.id)
    setDragGhost(undefined)
    onDragContact(undefined)
    if (event.currentTarget.hasPointerCapture(event.pointerId))
      event.currentTarget.releasePointerCapture(event.pointerId)
  }
  return {
    setResumeId,
    desktop,
    resumeOpener,
    backButton,
    drag,
    suppressClick,
    dragGhost,
    setDragGhost,
    professional,
    called,
    startDrag,
    moveDrag,
    finishDrag,
  }
}
