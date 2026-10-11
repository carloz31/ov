import { usePersonalConversationTopic } from '@/features/family-conversations/hooks/usePersonalConversationTopic'

import { ArrowLeft, BookOpenText, Check, CheckCircle2, MessageCircleHeart, UsersRound } from 'lucide-react'

import { GuideDialogue } from '@/components/common/GuideDialogue'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'

import type { FamilyConversation } from '@/types/adventure'

import { type ConversationAudience, type FamilyConversationTopic } from '@/data/content/familyConversations'
import { AnswerCard } from '@/features/family-conversations/components/AnswerCard'

export function ConversationTopicDetail({
  audience,
  conversation,
  onBack,
  onOpenJournal,
  topic,
}: {
  audience: ConversationAudience
  conversation?: FamilyConversation
  onBack: () => void
  onOpenJournal: () => void
  topic: FamilyConversationTopic
}) {
  const {
    answer,
    setAnswer,
    reflection,
    setReflection,
    ownAnswer,
    bothAnswered,
    ownMarked,
    saveAnswer,
    markConversation,
  } = usePersonalConversationTopic({ audience, conversation, topic })
  return (
    <div className={`${audience === 'student' ? 'adventure-page' : ''} min-h-full p-4 sm:p-8`}>
      <main className="mx-auto max-w-5xl">
        <Button className="-ml-3" onClick={onBack} variant="ghost">
          <ArrowLeft /> Volver a los temas
        </Button>
        <div className="mt-4 rounded-3xl border bg-card p-5 shadow-sm sm:p-8">
          <Badge variant="outline">{topic.block}</Badge>
          <h1 className="mt-4 text-2xl font-bold sm:text-3xl">{topic.title}</h1>

          {!ownAnswer ? (
            <section className="mt-7 max-w-2xl">
              <p className="text-lg font-semibold leading-8">{topic.prompts[audience]}</p>
              <label className="mt-6 block text-sm font-semibold" htmlFor={`answer-${topic.id}`}>
                Tu respuesta
                <textarea
                  id={`answer-${topic.id}`}
                  className="adventure-input mt-2 min-h-36"
                  value={answer}
                  onChange={(event) => setAnswer(event.target.value)}
                  placeholder="Escribe desde tu propia mirada..."
                />
              </label>
              <Button className="mt-4" disabled={!answer.trim()} onClick={saveAnswer}>
                Guardar mi respuesta
              </Button>
              <p className="mt-3 text-xs leading-5 text-muted-foreground">
                La otra respuesta seguirá oculta hasta que ambos hayan respondido.
              </p>
            </section>
          ) : !bothAnswered ? (
            <section className="mt-7 grid gap-5 md:grid-cols-2">
              <AnswerCard label="Tu mirada" question={topic.prompts[audience]} text={ownAnswer} />
              <div className="grid min-h-48 place-items-center rounded-2xl border border-dashed bg-muted/40 p-6 text-center">
                <div>
                  <UsersRound className="mx-auto mb-3 size-8 text-primary/65" />
                  <p className="font-semibold">
                    Esperando a {audience === 'student' ? 'tu papá, mamá o apoderado' : 'tu hijo/a'}
                  </p>
                  <p className="mt-2 text-sm text-muted-foreground">
                    La respuesta aparecerá cuando esté lista.
                  </p>
                </div>
              </div>
            </section>
          ) : (
            <>
              <section className="mt-7 grid gap-5 md:grid-cols-2" aria-label="Revelación de respuestas">
                <AnswerCard
                  label="Mirada del estudiante"
                  question={topic.prompts.student}
                  text={conversation?.student ?? ''}
                />
                <AnswerCard
                  label="Mirada de la familia"
                  question={topic.prompts.parent}
                  text={conversation?.parent ?? ''}
                />
              </section>
              <section className="mt-6 rounded-2xl bg-[var(--primary-soft)] p-5 sm:p-6">
                <h2 className="font-bold">Un puente entre ambas miradas</h2>
                <p className="mt-2 text-sm leading-7 text-muted-foreground">{topic.bridge}</p>
              </section>
              <section className="mt-6 grid gap-6 rounded-2xl border p-5 sm:p-6 md:grid-cols-[1fr_280px]">
                <div>
                  <h2 className="font-bold">Preguntas para conversar</h2>
                  <ul className="mt-4 space-y-3 text-sm leading-6">
                    {topic.guideQuestions.map((question) => (
                      <li className="flex gap-3" key={question}>
                        <MessageCircleHeart className="mt-0.5 size-4 shrink-0 text-primary" /> {question}
                      </li>
                    ))}
                  </ul>
                </div>
                <aside className="rounded-2xl bg-muted p-4 text-sm leading-6">
                  <strong>Algo que ya saben</strong>
                  <p className="mt-2 text-muted-foreground">{topic.toneTip}</p>
                </aside>
              </section>
              <p className="mt-6 text-center text-sm font-semibold text-muted-foreground">
                Ahora les toca conversar. Vuelvan cuando quieran contarnos cómo les fue.
              </p>

              <section className="mx-auto mt-6 max-w-2xl rounded-2xl border bg-muted/25 p-5 sm:p-6">
                {ownMarked ? (
                  <div className="text-center">
                    <CheckCircle2 className="mx-auto mb-3 size-9 text-[var(--family-completed-text)]" />
                    <h2 className="font-bold">Marcaste este tema como conversado</h2>
                    {reflection && (
                      <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-muted-foreground">
                        Tu reflexión privada: {reflection}
                      </p>
                    )}
                  </div>
                ) : (
                  <>
                    <h2 className="font-bold">Cuando hayan conversado</h2>
                    <label className="mt-4 block text-sm" htmlFor={`reflection-${topic.id}`}>
                      Reflexión privada opcional
                      <textarea
                        id={`reflection-${topic.id}`}
                        className="adventure-input mt-2 min-h-24"
                        value={reflection}
                        onChange={(event) => setReflection(event.target.value)}
                        placeholder="Una idea que quieras guardar solo para ti..."
                      />
                    </label>
                    <Button className="mt-4 w-full sm:w-auto" onClick={markConversation}>
                      <Check /> Ya conversamos
                    </Button>
                  </>
                )}
              </section>

              {audience === 'student' && ownMarked && (
                <section className="mt-6 flex flex-col gap-4 rounded-2xl border border-primary/25 bg-card p-5 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h2 className="font-bold">¿Quieres contarle algo a Lumi?</h2>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Es opcional y la entrada se abrirá con una pregunta sobre este tema.
                    </p>
                  </div>
                  <Button onClick={onOpenJournal} variant="outline">
                    <BookOpenText /> Contarle a Lumi
                  </Button>
                </section>
              )}
            </>
          )}
        </div>
      </main>
      <GuideDialogue
        audience={audience}
        text="Las respuestas tienen el mismo valor. La guía sirve para escucharse y encontrar preguntas que quieran seguir explorando juntos."
      />
    </div>
  )
}
