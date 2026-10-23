import { useEffect, useRef } from 'react'
import { Check, Mail, MailOpen } from 'lucide-react'
import { getDailyJournalPrompt } from '@/data/content/journalPrompts'
import { useAdventure } from '@/store/adventureStore'
import { lumiDayKey } from '@/lib/lumiFriendship'
import type { JournalEntry } from '@/types/adventure'
import { Seal } from '@/components/student/Seal'
import { updateStudentUi, useStudentUi } from '@/store/studentUiStore'

export type DailyQuestionEditorContext = {
  prompt: string
  linkedActivityId: string
  title: string
  lockedTags: string[]
}

// F05, solo api: la pregunta del servidor (sin temas), su respuesta de hoy y el error al pedirla.
export type PreguntaDelDiaServidor = {
  texto: string | null
  respondida: boolean
  respuesta?: JournalEntry
  abrir: () => void
  error: string
}

export function DailyQuestionCard({
  now,
  onRespond,
  onOpenAnswer,
  servidor,
}: {
  now: Date
  onRespond: (context: DailyQuestionEditorContext) => void
  onOpenAnswer: (entry: JournalEntry) => void
  servidor?: PreguntaDelDiaServidor
}) {
  const adventure = useAdventure()
  const ui = useStudentUi()
  const respondButton = useRef<HTMLButtonElement>(null)
  const focusOnDay = useRef<string | null>(null)
  const day = lumiDayKey(now)
  const dailyId = `daily-prompt-${day}`
  const answer = servidor
    ? servidor.respuesta
    : adventure.journal.find((entry) => entry.linkedActivityId === dailyId)
  const answered = servidor ? servidor.respondida : Boolean(answer)
  const opened = servidor ? servidor.texto !== null : ui.dailyQuestionOpenedOn === day
  // En api la pregunta llega después de pulsar: el foco espera a que se abra.
  const esperaServidor = Boolean(servidor) && !opened
  useEffect(() => {
    if (focusOnDay.current === day && opened && !answered) respondButton.current?.focus()
    if (!esperaServidor) focusOnDay.current = null
  }, [day, opened, answered, esperaServidor])

  let daily: ReturnType<typeof getDailyJournalPrompt> | undefined
  if (servidor) daily = { prompt: servidor.texto ?? '…', tags: [] } as typeof daily
  else
    try {
      daily = getDailyJournalPrompt(now)
    } catch {
      return null
    }
  if (!daily?.prompt?.trim()) return null

  const state = answered ? 'answered' : opened ? 'opened' : 'sealed'
  const Icon = answered ? Check : opened ? MailOpen : Mail
  const dateLabel = new Intl.DateTimeFormat('es-PE', {
    timeZone: 'America/Lima',
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  }).format(now)

  return (
    <section aria-label="La pregunta de hoy" className="sx-j-daily" data-state={state}>
      <div className="sx-j-daily-seal">
        <Seal state="revealed">
          <Icon size={32} />
        </Seal>
      </div>
      <div className="sx-j-daily-content">
        <p className="sx-j-daily-label">La pregunta de hoy · {dateLabel}</p>
        {answered ? (
          <>
            <h2>Ya respondiste la pregunta de hoy</h2>
            <p className="sx-j-daily-help">
              Mañana Lumi tendrá otra. Si un día no la respondes, no pasa nada.
            </p>
          </>
        ) : opened ? (
          <div className="sx-j-daily-question">
            <h2>“{daily.prompt}”</h2>
            {!servidor && (
              <div className="sx-j-daily-tags">
                {daily.tags.map((tag) => (
                  <span key={tag}>#{tag}</span>
                ))}
              </div>
            )}
          </div>
        ) : (
          <>
            <h2>Lumi dejó una pregunta nueva para ti</h2>
            <p className="sx-j-daily-help">Cambia cada día. Ábrela cuando quieras.</p>
            {servidor?.error && <p className="sx-j-daily-help">{servidor.error}</p>}
          </>
        )}
      </div>
      {answered ? (
        answer && (
          <a
            className="sx-j-daily-link"
            href={`#journal-entry-${answer.id}`}
            onClick={(event) => {
              event.preventDefault()
              onOpenAnswer(answer)
            }}
          >
            Ver mi respuesta
          </a>
        )
      ) : opened ? (
        <button
          ref={respondButton}
          type="button"
          className="sx-d-action sx-j-daily-action"
          onClick={() =>
            onRespond({
              prompt: daily.prompt,
              linkedActivityId: dailyId,
              title: servidor ? '' : 'Tema del día',
              lockedTags: daily.tags,
            })
          }
        >
          Responder
        </button>
      ) : (
        <button
          type="button"
          className="sx-d-action sx-j-daily-action"
          onClick={() => {
            focusOnDay.current = day
            if (servidor) servidor.abrir()
            else updateStudentUi((current) => ({ ...current, dailyQuestionOpenedOn: day }))
          }}
        >
          Abrir la pregunta
        </button>
      )}
    </section>
  )
}
