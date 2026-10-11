import { usePersonalFamilyConversations } from '@/features/family-conversations/hooks/usePersonalFamilyConversations'

import { HeartHandshake, LockKeyhole, MessageCircleHeart } from 'lucide-react'

import { GuideDialogue } from '@/components/common/GuideDialogue'
import { Badge } from '@/components/ui/Badge'

import { canAccessFamilyConversations } from '@/store/adventureStore'

import { appPaths } from '@/routes/paths'

import '@/styles/student/adventure.css'
import { type ConversationAudience } from '@/data/content/familyConversations'

type ConversationTab = 'answer' | 'waiting' | 'ready' | 'completed'

const tabs: { id: ConversationTab; label: string }[] = [
  { id: 'answer', label: 'Te toca responder' },
  { id: 'waiting', label: 'Esperando respuesta' },
  { id: 'ready', label: 'Listos para conversar' },
  { id: 'completed', label: 'Conversados' },
]

function FamilyConversationsView({ audience = 'student' }: { audience?: ConversationAudience }) {
  const {
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
  } = usePersonalFamilyConversations(audience)
  if (!canAccessFamilyConversations(state)) {
    return (
      <div className="p-5 sm:p-8">
        <section className="mx-auto max-w-2xl rounded-3xl border bg-card p-8">
          <LockKeyhole className="mb-4 size-10 text-primary" />
          <h1 className="text-2xl font-bold">Un espacio para conversar en familia</h1>
          <p className="my-4 text-sm leading-7 text-muted-foreground">
            Todos los temas estarán disponibles cuando el estudiante complete el cierre del Bloque 5. Después
            podrán recorrerlos a su ritmo, sin fechas límite.
          </p>
        </section>
      </div>
    )
  }

  if (selected) {
    return (
      <ConversationTopicDetail
        audience={audience}
        conversation={selected.conversation}
        onBack={() => setSelectedTopicId(undefined)}
        onOpenJournal={() =>
          navigate(`${appPaths.student.journal}?conversation=${encodeURIComponent(selected.topic.id)}`)
        }
        topic={selected.topic}
      />
    )
  }

  return (
    <div className={`${audience === 'student' ? 'adventure-page' : ''} min-h-full p-4 sm:p-8`}>
      <div className="mx-auto max-w-6xl">
        <header className="mb-6">
          <Badge variant="secondary">
            <HeartHandshake className="size-4" /> Conversaciones en familia
          </Badge>
          <h1 className="mb-3 mt-4 text-3xl font-bold">Dos miradas, una conversación</h1>
          <p className="max-w-3xl text-sm leading-7 text-muted-foreground">
            Respondan por separado. Cuando estén ambas respuestas, encontrarán una guía para conversar fuera
            de la plataforma y cerrar el tema cuando quieran.
          </p>
        </header>

        <GiftProgressCard
          audience={audience}
          canOpen={canPreviewGift}
          completed={giftCompleted}
          completedCount={completedCount}
          open={giftOpen}
          onOpenChange={setGiftOpen}
        />

        <nav
          aria-label="Estados de conversación"
          className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          {tabs.map((tab) => {
            const count = topicRows.filter(({ status }) => status === tab.id).length
            return (
              <button
                key={tab.id}
                type="button"
                aria-current={activeTab === tab.id ? 'page' : undefined}
                className={`flex min-w-fit items-center gap-2 rounded-full border px-4 py-2 text-left text-xs font-semibold transition sm:text-sm ${
                  activeTab === tab.id
                    ? 'border-primary bg-primary text-primary-foreground shadow-sm'
                    : 'bg-card hover:border-primary/40 hover:bg-muted/50'
                }`}
                onClick={() => setActiveTab(tab.id)}
              >
                <span>{tab.label}</span>
                <span className="grid size-5 shrink-0 place-items-center rounded-full bg-card/18 text-[10px]">
                  {count}
                </span>
              </button>
            )
          })}
        </nav>

        <section className="mt-5 grid gap-4 lg:grid-cols-2">
          {topicRows
            .filter(({ status }) => status === activeTab)
            .map(({ topic, conversation, status }) => (
              <ConversationTopicCard
                key={topic.id}
                audience={audience}
                conversation={conversation}
                onOpen={() => setSelectedTopicId(topic.id)}
                status={status}
                topic={topic}
              />
            ))}
        </section>
        {!topicRows.some(({ status }) => status === activeTab) && (
          <div className="mt-5 rounded-3xl border border-dashed bg-card/60 p-10 text-center">
            <MessageCircleHeart className="mx-auto mb-3 size-9 text-primary/65" />
            <p className="font-semibold">No hay temas en este estado por ahora.</p>
            <p className="mt-2 text-sm text-muted-foreground">Pueden volver cuando quieran.</p>
          </div>
        )}
      </div>
      <GuideDialogue
        audience={audience}
        text="No hace falta estar de acuerdo en todo. Respondan desde su propia mirada y usen la guía cuando encuentren un momento tranquilo para escucharse."
      />
    </div>
  )
}

import { ConversationTopicCard } from '@/features/family-conversations/components/ConversationTopicCard'

import { ConversationTopicDetail } from '@/features/family-conversations/components/ConversationTopicDetail'

import { GiftProgressCard } from '@/features/family-conversations/components/GiftProgressCard'

export { FamilyConversationsView }
