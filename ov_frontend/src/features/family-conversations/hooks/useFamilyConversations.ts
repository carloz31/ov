import { getTopicStatus, getConversationGift } from '../lib/conversations'
import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router'
import { useAdventure } from '@/store/adventureStore'
import { familyConversationDemoData, familyConversationTopics } from '@/data/content/familyConversations'
type ConversationTab = 'answer' | 'waiting' | 'ready' | 'completed'

export function useFamilyConversations() {
  const state = useAdventure()
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState<ConversationTab>('answer')
  const [selectedTopicId, setSelectedTopicId] = useState<string>()
  const [giftOpen, setGiftOpen] = useState(false)
  const conversations = useMemo(() => {
    const values = new Map(familyConversationDemoData.map((conversation) => [conversation.id, conversation]))
    state.conversations.forEach((conversation) => values.set(conversation.id, conversation))
    return values
  }, [state.conversations])
  const topicRows = familyConversationTopics.map((topic) => {
    const conversation = conversations.get(topic.id)
    return { topic, conversation, status: getTopicStatus(conversation, 'student') }
  })
  const selected = topicRows.find(({ topic }) => topic.id === selectedTopicId)
  const completedCount = topicRows.filter(({ status }) => status === 'completed').length
  const { giftCompleted, canPreviewGift } = getConversationGift(completedCount)

  return {
    state,
    navigate,
    activeTab,
    setActiveTab,
    setSelectedTopicId,
    giftOpen,
    setGiftOpen,
    topicRows,
    selected,
    completedCount,
    giftCompleted,
    canPreviewGift,
  }
}
