import { BookOpen } from 'lucide-react'

export function FinishJournalSection({
  pregunta,
  nueva,
  onWrite,
}: {
  pregunta: string
  nueva: boolean
  onWrite: () => void
}) {
  return (
    <section className="sx-finish-journal" aria-labelledby="finish-journal-title">
      <h3 id="finish-journal-title">
        Una pregunta para tu diario{' '}
        {nueva && (
          <span className="sx-finish-new" aria-label="Pregunta nueva">
            <span aria-hidden="true">!</span> Nueva
          </span>
        )}
      </h3>
      <blockquote>{pregunta}</blockquote>
      <button className="sx-secondary-button" onClick={onWrite}>
        <BookOpen size={16} /> Escribir en mi diario
      </button>
    </section>
  )
}
