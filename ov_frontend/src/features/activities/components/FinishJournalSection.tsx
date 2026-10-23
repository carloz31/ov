import { BookOpen } from 'lucide-react'

export function FinishJournalSection({
  pregunta,
  nueva,
  onWrite,
  titulo = 'Una pregunta para tu diario',
}: {
  pregunta: string
  nueva: boolean
  onWrite: () => void
  // F05, solo api: «Lumi te dejó una pregunta en tu diario».
  titulo?: string
}) {
  return (
    <section className="sx-finish-journal" aria-labelledby="finish-journal-title">
      <h3 id="finish-journal-title">
        {titulo}{' '}
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
