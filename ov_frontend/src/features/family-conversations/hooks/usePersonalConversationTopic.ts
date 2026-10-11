import { updateConversation } from '@/features/family-conversations/lib/conversations'
import { useState } from 'react'

import type { FamilyConversation } from '@/types/adventure'
import { type ConversationAudience, type FamilyConversationTopic } from '@/data/content/familyConversations'

export function usePersonalConversationTopic({
  audience,
  conversation,
  topic,
}: {
  audience: ConversationAudience
  conversation?: FamilyConversation
  topic: FamilyConversationTopic
}) {
  const [answer, setAnswer] = useState('')
  const [reflection, setReflection] = useState(
    conversation?.[audience === 'student' ? 'studentReflection' : 'parentReflection'] ?? '',
  )
  const ownAnswer = conversation?.[audience]
  const otherAudience = audience === 'student' ? 'parent' : 'student'
  const otherAnswer = conversation?.[otherAudience]
  const bothAnswered = Boolean(ownAnswer && otherAnswer)
  const ownMarkedKey = audience === 'student' ? 'studentMarkedAt' : 'parentMarkedAt'
  const ownMarked = Boolean(conversation?.[ownMarkedKey])

  function saveAnswer() {
    if (!answer.trim() || ownAnswer) return
    updateConversation(topic.id, (current) => ({
      ...current,
      [audience]: answer.trim(),
      [audience === 'student' ? 'studentAnsweredAt' : 'parentAnsweredAt']: new Date().toISOString(),
    }))
    setAnswer('')
  }

  function markConversation() {
    if (!bothAnswered || ownMarked) return
    updateConversation(topic.id, (current) => {
      const timestamp = new Date().toISOString()
      const next: FamilyConversation = {
        ...current,
        [ownMarkedKey]: timestamp,
        [audience === 'student' ? 'studentReflection' : 'parentReflection']: reflection.trim() || undefined,
      }
      if (next.studentMarkedAt && next.parentMarkedAt) next.completedAt = timestamp
      return next
    })
  }

  return {
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
