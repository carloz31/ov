import type { FamilyConversation } from '@/types/adventure'

import { type ConversationAudience } from '@/data/content/familyConversations'
import { ParticipantState } from '@/features/family-conversations/components/ParticipantState'

export function ParticipantPair({
  audience,
  conversation,
}: {
  audience: ConversationAudience
  conversation?: FamilyConversation
}) {
  return (
    <div className="flex -space-x-2" aria-label="Participación en el tema">
      <ParticipantState
        answered={Boolean(conversation?.student)}
        label={audience === 'student' ? 'Tú' : 'Estudiante'}
        marked={Boolean(conversation?.studentMarkedAt)}
        initials="E"
      />
      <ParticipantState
        answered={Boolean(conversation?.parent)}
        label={audience === 'parent' ? 'Tú' : 'Familia'}
        marked={Boolean(conversation?.parentMarkedAt)}
        initials="F"
      />
    </div>
  )
}
