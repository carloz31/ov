import type { FamilyConversation } from '@/types/adventure'

import { ParticipantState } from '@/features/family-conversations/components/immersive/ParticipantState'

export function ParticipantPair({ conversation }: { conversation?: FamilyConversation }) {
  return (
    <div className="flex -space-x-2" aria-label="Participación en el tema">
      <ParticipantState
        answered={Boolean(conversation?.student)}
        label={'Tú'}
        marked={Boolean(conversation?.studentMarkedAt)}
        initials="E"
      />
      <ParticipantState
        answered={Boolean(conversation?.parent)}
        label={'Familia'}
        marked={Boolean(conversation?.parentMarkedAt)}
        initials="F"
      />
    </div>
  )
}
