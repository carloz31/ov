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

export function DailyQuestionCard({
  now,
  onRespond,
  onOpenAnswer,
}: {
  now: Date
  onRespond: (context: DailyQuestionEditorContext) => void
  onOpenAnswer: (entry: JournalEntry) => void
}) {
  const adventure = useAdventure()
  const ui = useStudentUi()
  const respondButton = useRef<HTMLButtonElement>(null)
  const focusOnDay = useRef<string | null>(null)
  const day = lumiDayKey(now)
  const dailyId = `daily-prompt-${day}`
  const answer = adventure.journal.find((entry) => entry.linkedActivityId === dailyId)
  const opened = ui.dailyQuestionOpenedOn === day
  useEffect(() => {
    if (focusOnDay.current === day && opened && !answer) respondButton.current?.focus()
    focusOnDay.current = null
  }, [day, opened, answer])

  let daily: ReturnType<typeof getDailyJournalPrompt> | undefined
  try {
    daily = getDailyJournalPrompt(now)
  } catch {
    return null
  }
  if (!daily?.prompt?.trim()) return null

  const state = answer ? 'answered' : opened ? 'opened' : 'sealed'
  const Icon = answer ? Check : opened ? MailOpen : Mail
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
        {answer ? (
          <>
            <h2>Ya respondiste la pregunta de hoy</h2>
            <p className="sx-j-daily-help">
              Mañana Lumi tendrá otra. Si un día no la respondes, no pasa nada.
            </p>
          </>
        ) : opened ? (
          <div className="sx-j-daily-question">
            <h2>“{daily.prompt}”</h2>
            <div className="sx-j-daily-tags">
              {daily.tags.map((tag) => (
                <span key={tag}>#{tag}</span>
              ))}
            </div>
          </div>
        ) : (
          <>
            <h2>Lumi dejó una pregunta nueva para ti</h2>
            <p className="sx-j-daily-help">Cambia cada día. Ábrela cuando quieras.</p>
          </>
        )}
      </div>
      {answer ? (
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
      ) : opened ? (
        <button
          ref={respondButton}
          type="button"
          className="sx-d-action sx-j-daily-action"
          onClick={() =>
            onRespond({
              prompt: daily.prompt,
              linkedActivityId: dailyId,
              title: 'Tema del día',
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
            updateStudentUi((current) => ({ ...current, dailyQuestionOpenedOn: day }))
          }}
        >
          Abrir la pregunta
        </button>
      )}
    </section>
  )
}
