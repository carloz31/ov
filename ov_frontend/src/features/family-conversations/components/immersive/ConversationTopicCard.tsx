import { ArrowRight, BookOpenText } from 'lucide-react'

import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'

import type { FamilyConversation } from '@/types/adventure'

import { cn } from '@/lib/utils'
import { type FamilyConversationTopic } from '@/data/content/familyConversations'
import { ParticipantPair } from '@/features/family-conversations/components/immersive/ParticipantPair'
type ConversationTab = 'answer' | 'waiting' | 'ready' | 'completed'

export function ConversationTopicCard({
  conversation,
  onOpen,
  status,
  topic,
}: {
  conversation?: FamilyConversation
  onOpen: () => void
  status: ConversationTab
  topic: FamilyConversationTopic
}) {
  const otherLabel = 'tu papá, mamá o apoderado'
  const actionLabels: Record<ConversationTab, string> = {
    answer: 'Responder',
    waiting: 'Ver respuesta',
    ready: 'Ver encuentro',
    completed: 'Consultar',
  }
  const cardStyles: Record<ConversationTab, string> = {
    answer: 'border-[var(--family-answer-border)] bg-[image:var(--student-family-answer-image)]',
    waiting: 'border-[var(--family-waiting-border)] bg-[image:var(--student-family-waiting-image)]',
    ready: 'border-[var(--family-ready-border)] bg-[image:var(--student-family-ready-image)]',
    completed: 'border-[var(--family-completed-border)] bg-[image:var(--student-family-completed-image)]',
  }
  const statusCopy: Record<ConversationTab, string> = {
    answer: 'Tu respuesta está pendiente',
    waiting: `Esperando a ${otherLabel}`,
    ready: 'Ambas respuestas están listas',
    completed: 'Ambos marcaron la conversación',
  }
  return (
    <article
      data-family-status={status}
      className={cn(
        'relative flex min-h-[250px] flex-col overflow-hidden rounded-[26px] border p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md sm:p-6',
        cardStyles[status],
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <Badge
          className="max-w-[calc(100%-3.5rem)] whitespace-normal border-current/15 bg-card/60"
          variant="outline"
        >
          <BookOpenText className="size-3.5" /> {topic.block}
        </Badge>
        <span aria-hidden="true" className="text-3xl drop-shadow-sm sm:text-4xl">
          {topic.symbol}
        </span>
      </div>
      <p className="mt-4 text-[11px] font-bold tracking-[0.1em] text-foreground/55">{topic.title}</p>
      <h2 className="mt-2 max-w-[34rem] text-lg font-bold leading-7 text-foreground sm:text-xl">
        {topic.prompts.student}
      </h2>
      <div className="mt-auto flex items-end justify-between gap-3 pt-6">
        <div>
          <ParticipantPair conversation={conversation} />
          <p data-family-status-copy className="mt-2 text-[11px] font-semibold text-foreground/55">
            {statusCopy[status]}
          </p>
        </div>
        <Button
          className="shrink-0 rounded-full px-4"
          onClick={onOpen}
          size="sm"
          variant={status === 'answer' ? 'default' : 'outline'}
        >
          {actionLabels[status]} <ArrowRight />
        </Button>
      </div>
    </article>
  )
}
