import { ArrowRight } from 'lucide-react'

import type { JournalEntry } from '@/types/adventure'

import { JournalTags } from '@/features/journal/components/JournalTags'

export function JournalCard({ entry, onOpen }: { entry: JournalEntry; onOpen: () => void }) {
  const daily = entry.linkedActivityId?.startsWith('daily-prompt-')
  return (
    <article className="sx-j-entry" data-kind={daily ? 'daily' : entry.kind}>
      <time>
        {new Date(entry.createdAt).toLocaleDateString('es-PE', {
          dateStyle: 'long',
          timeZone: 'America/Lima',
        })}
      </time>
      <span className="sx-j-origin">
        {daily ? 'Pregunta del día' : entry.kind === 'open' ? 'Libre' : 'Carta de Lumi'}
      </span>
      <h3>{entry.title}</h3>
      {entry.promptShown && <p className="sx-j-question">Lumi: “{entry.promptShown}”</p>}
      <p className="sx-d-clamp-two">{entry.body}</p>
      <JournalTags tags={entry.topicTags} />
      <button type="button" className="sx-d-action sx-d-action-ghost" onClick={onOpen}>
        Leer completa <ArrowRight size={16} aria-hidden="true" />
      </button>
    </article>
  )
}
