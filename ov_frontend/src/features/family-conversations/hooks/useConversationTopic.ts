import { useState } from 'react'
import { useStudentOverlays } from '@/features/adventure/context/overlayContext'
import type { FamilyConversation } from '@/types/adventure'
import { type FamilyConversationTopic } from '@/data/content/familyConversations'
import { updateConversation } from '@/features/family-conversations/lib/conversations'
export function useConversationTopic({
  conversation,
  topic,
}: {
  conversation?: FamilyConversation
  topic: FamilyConversationTopic
}) {
  const { openGuide } = useStudentOverlays()
  const [answer, setAnswer] = useState('')
  const [reflection, setReflection] = useState(conversation?.studentReflection ?? '')
  const ownAnswer = conversation?.student
  const otherAnswer = conversation?.parent
  const bothAnswered = Boolean(ownAnswer && otherAnswer)
  const ownMarked = Boolean(conversation?.studentMarkedAt)

  function saveAnswer() {
    if (!answer.trim() || ownAnswer) return
    updateConversation(topic.id, (current) => ({
      ...current,
      student: answer.trim(),
      studentAnsweredAt: new Date().toISOString(),
    }))
    setAnswer('')
  }

  function markConversation() {
    if (!bothAnswered || ownMarked) return
    updateConversation(topic.id, (current) => {
      const timestamp = new Date().toISOString()
      const next: FamilyConversation = {
        ...current,
        studentMarkedAt: timestamp,
        studentReflection: reflection.trim() || undefined,
      }
      if (next.studentMarkedAt && next.parentMarkedAt) next.completedAt = timestamp
      return next
    })
  }

  return {
    openGuide,
    answer,
    setAnswer,
    reflection,
    setReflection,
    ownAnswer,
    bothAnswered,
    ownMarked,
    saveAnswer,
    markConversation,
  }
}
