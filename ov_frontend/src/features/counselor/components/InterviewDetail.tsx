import { interviewDetails, reactionOptions } from '@/features/counselor/data/interviewDetails'
import { useState } from 'react'
import {
  ArrowLeft,
  Check,
  ExternalLink,
  FileText,
  Flag,
  GraduationCap,
  MessageCircle,
  Play,
  Send,
  Sparkles,
  UserRound,
  Users,
} from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { safeVideoUrl } from '@/store/adventureStore'
import type { AdventureState } from '@/types/adventure'

export function InterviewDetail({
  video,
  reaction,
  onBack,
  onReact,
  onReport,
  readOnly = false,
  backLabel = 'Comunidad',
  communityReactions,
  actions,
}: {
  video: AdventureState['videos'][number]
  reaction?: AdventureState['reactions'][number]
  onBack: () => void
  onReact: (option: (typeof reactionOptions)[number]) => void
  onReport: () => void
  readOnly?: boolean
  backLabel?: string
  communityReactions?: { kind: string; count: number }[]
  actions?: import('react').ReactNode
}) {
  const [comment, setComment] = useState('')
  const [selectedOption, setSelectedOption] = useState<(typeof reactionOptions)[number] | null>(null)
  const [myComments, setMyComments] = useState<{ reaction: string; text: string }[]>([])
  const detail = interviewDetails[video.id] ?? {
    career: video.title,
    path: 'Por definir',
    professional: 'Profesional entrevistado',
    duration: '5–10 min',
    summary: video.reflection,
    comments: [],
  }
  return (
    <div className={readOnly ? 'min-h-full min-w-0 p-4 sm:p-8' : 'adventure-page min-h-full p-4 sm:p-8'}>
      <Button variant="ghost" className="min-h-11" onClick={onBack}>
        <ArrowLeft /> Volver a {backLabel}
      </Button>
      <div className="mx-auto mt-5 max-w-6xl">
        <div
          className={
            readOnly
              ? 'overflow-hidden rounded-xl border border-border bg-card'
              : 'adventure-card overflow-hidden p-0'
          }
        >
          <div className="grid h-56 place-items-center bg-muted">
            <Play className="size-16 text-muted-foreground" />
          </div>
          <div className="p-6 sm:p-8">
            <div className="flex flex-wrap gap-2">
              <Badge variant="secondary">
                <GraduationCap className="size-3.5" /> {detail.career}
              </Badge>
              <Badge variant="outline">{detail.path}</Badge>
              {!readOnly && (
                <Badge variant="success">
                  <Check className="size-3.5" /> Consentimiento confirmado
                </Badge>
              )}
            </div>
            <h1 className="mt-5 text-3xl font-bold break-words">{video.title}</h1>
            {actions && <div className="mt-4 flex flex-wrap gap-2">{actions}</div>}
            <p className="mt-2 text-sm text-muted-foreground">
              Entrevista de {detail.duration} · Publicada por {video.alias}
            </p>
            <p className="mt-5 max-w-2xl leading-7">{video.reflection}</p>
            {safeVideoUrl(video.url) && (
              <Button className="mt-5 min-h-11" asChild>
                <a href={safeVideoUrl(video.url)!} target="_blank" rel="noreferrer">
                  Ver video completo <ExternalLink />
                </a>
              </Button>
            )}
          </div>
        </div>
        <div className="mt-5 grid gap-5 lg:grid-cols-[1fr_1.55fr]">
          <aside
            className={
              readOnly ? 'min-w-0 rounded-xl border border-border bg-card p-6' : 'adventure-card p-6'
            }
          >
            <div className="flex items-center gap-2">
              <div className="grid size-9 place-items-center rounded-xl bg-muted text-muted-foreground">
                <FileText className="size-5" />
              </div>
              <h2 className="font-bold">Ficha de la entrevista</h2>
            </div>
            <dl className="mt-5 grid gap-3 text-sm">
              <div className="rounded-2xl bg-muted p-4">
                <dt className="flex items-center gap-2 font-semibold text-muted-foreground">
                  <GraduationCap className="size-4" /> Carrera o profesión
                </dt>
                <dd className="mt-1 font-medium">{detail.career}</dd>
              </div>
              <div className="rounded-2xl bg-muted p-4">
                <dt className="flex items-center gap-2 font-semibold text-muted-foreground">
                  <UserRound className="size-4" /> Profesional entrevistado
                </dt>
                <dd className="mt-1 font-medium">{detail.professional}</dd>
              </div>
              <div className="rounded-2xl bg-muted p-4">
                <dt className="flex items-center gap-2 font-semibold text-muted-foreground">
                  <Users className="size-4" /> Quienes la realizaron
                </dt>
                <dd className="mt-1 font-medium">{video.alias}</dd>
              </div>
              <div className="rounded-2xl bg-muted p-4">
                <dt className="flex items-center gap-2 font-semibold text-muted-foreground">
                  <Sparkles className="size-4" /> En pocas palabras
                </dt>
                <dd className="mt-1 leading-6">{detail.summary}</dd>
              </div>
            </dl>
          </aside>
          {readOnly && (
            <section
              className={
                readOnly ? 'min-w-0 rounded-xl border border-border bg-card p-6' : 'adventure-card p-6'
              }
            >
              <h2 className="flex items-center gap-2 font-bold">
                <MessageCircle className="size-5" /> Reacciones de estudiantes
              </h2>
              <div className="mt-4 grid gap-3 sm:grid-cols-3">
                {(communityReactions ?? []).map((item) => (
                  <div key={item.kind} className="rounded-xl border bg-card p-4">
                    <p className="text-2xl font-bold">{item.count}</p>
                    <p className="mt-1 text-sm">{item.kind}</p>
                  </div>
                ))}
              </div>
              {!(communityReactions ?? []).some((item) => item.count > 0) && (
                <p className="mt-4 text-sm text-muted-foreground">Aún no hay reacciones.</p>
              )}
              <h3 className="mt-6 font-semibold">Comentarios</h3>
              <div className="mt-3 space-y-3">
                {detail.comments
                  .filter((item) => item.text)
                  .map((item, index) => (
                    <div key={index} className="rounded-xl border p-4 text-sm">
                      <p className="font-semibold">
                        {item.author}{' '}
                        <span className="font-normal text-muted-foreground">· {item.reaction}</span>
                      </p>
                      <p className="mt-2">{item.text}</p>
                    </div>
                  ))}
                {!detail.comments.some((item) => item.text) && (
                  <p className="text-sm text-muted-foreground">Aún no hay comentarios.</p>
                )}
              </div>
            </section>
          )}
          {!readOnly && (
            <section
              className={
                readOnly ? 'min-w-0 rounded-xl border border-border bg-card p-6' : 'adventure-card p-6'
              }
            >
              <h2 className="font-bold">¿Qué te dejó esta entrevista?</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Reacciona como en una publicación y, si quieres, comparte una idea.
              </p>
              <div className="mt-4 flex flex-col gap-2">
                {reactionOptions.map((option) => {
                  const Icon = option.icon
                  return (
                    <Button
                      key={option.label}
                      className="h-auto justify-start whitespace-normal py-3 text-left"
                      variant={reaction?.kind === option.label ? 'default' : 'outline'}
                      onClick={() => {
                        setSelectedOption(option)
                        onReact(option)
                      }}
                    >
                      <Icon className="size-5" />
                      {option.label}
                    </Button>
                  )
                })}
              </div>
              {selectedOption && (
                <div className="mt-4 rounded-2xl border border-border bg-muted p-4">
                  <label className="block text-sm font-semibold">
                    {selectedOption.prompt}
                    <textarea
                      value={comment}
                      onChange={(event) => setComment(event.target.value)}
                      className="adventure-input mt-2 min-h-24 bg-card"
                      placeholder="Escribe un poco más si quieres..."
                    />
                  </label>
                  <Button
                    className="mt-3"
                    disabled={!comment.trim()}
                    onClick={() => {
                      setMyComments((items) => [
                        ...items,
                        { reaction: selectedOption.label, text: comment.trim() },
                      ])
                      setComment('')
                    }}
                  >
                    <Send /> Publicar comentario
                  </Button>
                </div>
              )}
              <div className="mt-7 border-t pt-5">
                <h2 className="flex items-center gap-2 font-bold">
                  <MessageCircle className="size-5" /> Conversación de la comunidad
                </h2>
                <div className="mt-4 space-y-3">
                  {[...detail.comments, ...myComments.map((item) => ({ author: 'Alex', ...item }))].map(
                    (item, index) => (
                      <div key={index} className="rounded-xl bg-muted p-3 text-sm">
                        <p className="font-semibold">
                          {item.author}{' '}
                          <span className="font-normal text-muted-foreground">· {item.reaction}</span>
                        </p>
                        {item.text && <p className="mt-1 leading-6">{item.text}</p>}
                      </div>
                    ),
                  )}
                  {!detail.comments.length && !myComments.length && (
                    <p className="text-sm text-muted-foreground">
                      Aún no hay comentarios. Puedes abrir la conversación.
                    </p>
                  )}
                </div>
              </div>
              <div className="mt-6 border-t pt-4">
                <Button size="sm" variant="ghost" className="text-muted-foreground" onClick={onReport}>
                  <Flag /> ¿Algo no está bien? Reportar
                </Button>
              </div>
            </section>
          )}
        </div>
      </div>
    </div>
  )
}
