import { prototypeAllUnlocked, updateAdventure } from '@/store/adventureStore'
import type { AdventureState, FamilyConversation } from '@/types/adventure'
import {
  familyConversationTopics,
  getFamilyConversationDemo,
  getFamilyGiftLetter,
  type ConversationAudience,
} from '@/data/content/familyConversations'
export type ConversationTab = 'answer' | 'waiting' | 'ready' | 'completed'
export function updateConversation(id: string, update: (current: FamilyConversation) => FamilyConversation) {
  updateAdventure((state) => {
    const current = state.conversations.find((conversation) => conversation.id === id) ??
      getFamilyConversationDemo(id) ?? { id }
    return {
      ...state,
      conversations: [
        ...state.conversations.filter((conversation) => conversation.id !== id),
        update(current),
      ],
    }
  })
}

export function getTopicStatus(
  conversation: FamilyConversation | undefined,
  audience: ConversationAudience,
): ConversationTab {
  const ownAnswer = conversation?.[audience]
  const otherAnswer = conversation?.[audience === 'student' ? 'parent' : 'student']
  if (!ownAnswer) return 'answer'
  if (!otherAnswer) return 'waiting'
  if (conversation?.studentMarkedAt && conversation.parentMarkedAt) return 'completed'
  return 'ready'
}

export function getConversationGift(completedCount: number) {
  const giftCompleted = completedCount === familyConversationTopics.length
  const canPreviewGift = prototypeAllUnlocked || giftCompleted
  return { giftCompleted, canPreviewGift }
}
export function getGiftResource(state: AdventureState, audience: ConversationAudience) {
  const resourceId = `family-letter-${audience}`
  const saved = state.bookmarks.includes(resourceId)
  const letter = getFamilyGiftLetter(state, audience)
  return { resourceId, saved, letter }
}
