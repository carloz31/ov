import { ArrowLeft, PenLine, Trash2 } from 'lucide-react'

import type { JournalEntry } from '@/types/adventure'

import { Parchment } from '@/components/student/Parchment'

import { JournalTags } from '@/features/journal/components/JournalTags'

export function JournalDetail({
  entry,
  onBack,
  onDelete,
  onEdit,
}: {
  entry: JournalEntry
  onBack: () => void
  onDelete: () => void
  onEdit: () => void
}) {
  return (
    <>
      <button type="button" className="sx-d-back" onClick={onBack}>
        <ArrowLeft aria-hidden="true" />
        Volver al diario
      </button>
      <Parchment className="sx-j-notebook sx-j-detail">
        <time>
          {new Date(entry.createdAt).toLocaleDateString('es-PE', {
            dateStyle: 'long',
            timeZone: 'America/Lima',
          })}
        </time>
        <p className="sx-j-origin">{entry.kind === 'open' ? 'Libre' : 'Carta de Lumi'}</p>
        <h1 id={`journal-entry-${entry.id}`}>{entry.title}</h1>
        {entry.promptShown && <p className="sx-j-question sx-j-prompt">Lumi: “{entry.promptShown}”</p>}
        <p className="sx-j-full-text">{entry.body}</p>
        <JournalTags tags={entry.topicTags} />
        <div className="sx-j-editor-actions">
          <button type="button" className="sx-d-action sx-d-action-ghost" onClick={onEdit}>
            <PenLine aria-hidden="true" size={16} />
            Editar
          </button>
          <button type="button" className="sx-j-delete" onClick={onDelete}>
            <Trash2 aria-hidden="true" size={16} />
            Borrar
          </button>
        </div>
      </Parchment>
    </>
  )
}
