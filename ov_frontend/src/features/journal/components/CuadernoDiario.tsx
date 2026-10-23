import { Search } from 'lucide-react'
import { useJournalHome } from '@/features/journal/hooks/useJournalHome'
import { LumiPortrait } from '@/features/journal/components/LumiPortrait'
import type { JournalEntry } from '@/types/adventure'
import { Parchment } from '@/components/student/Parchment'
import { JournalCard } from '@/features/journal/components/JournalCard'
import { JournalTab } from '@/features/journal/components/JournalTab'

type JournalGrouping = 'timeline' | 'topics'
// El cuaderno del diario: lo que el estudiante le ha contado a Lumi.
export function CuadernoDiario({
  entries,
  grouping,
  onChangeGrouping,
  onOpen,
  query,
  setQuery,
  mostrarTemas,
}: {
  entries: JournalEntry[]
  grouping: JournalGrouping
  onChangeGrouping: (grouping: JournalGrouping) => void
  onOpen: (entry: JournalEntry) => void
  query: string
  setQuery: (query: string) => void
  mostrarTemas: boolean
}) {
  const { topic, setTopic, tags, shown, months } = useJournalHome({ entries, grouping })
  return (
    <Parchment className="sx-j-notebook" label="Tu cuaderno" title="Lo que le has contado a Lumi">
      <div className="sx-j-notebook-controls">
        <nav aria-label="Organizar conversaciones" className="sx-j-tabs">
          <JournalTab
            active={grouping === 'timeline'}
            label="Línea de tiempo"
            onClick={() => onChangeGrouping('timeline')}
          />
          {mostrarTemas && (
            <JournalTab
              active={grouping === 'topics'}
              label="Por tema"
              onClick={() => onChangeGrouping('topics')}
            />
          )}
        </nav>
        {mostrarTemas && (
          <label className="sx-j-search">
            <Search aria-hidden="true" size={16} />
            <span className="sr-only">Buscar por tema</span>
            <input
              className="sx-d-input"
              placeholder="Buscar por tema..."
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
          </label>
        )}
      </div>
      {mostrarTemas && grouping === 'topics' && (
        <div className="sx-j-topic-filters">
          {tags.map((tag) => (
            <button
              type="button"
              aria-pressed={topic === tag}
              key={tag}
              onClick={() => setTopic(topic === tag ? undefined : tag)}
            >
              #{tag} {entries.filter((e) => e.topicTags.includes(tag)).length}
            </button>
          ))}
        </div>
      )}
      {!shown.length ? (
        <div className="sx-j-empty">
          <span className="sx-j-empty-lumi">
            <LumiPortrait />
          </span>
          <h3>
            {entries.length
              ? 'No encontramos conversaciones con este tema'
              : 'Todavía no has escrito nada aquí'}
          </h3>
          <p>
            Este espacio está listo cuando quieras usarlo. No hace falta esperar a que algo importante pase.
          </p>
        </div>
      ) : grouping === 'timeline' ? (
        Object.entries(months).map(([month, items]) => (
          <section className="sx-j-thread" key={month}>
            <h3>{month}</h3>
            {items.map((entry) => (
              <JournalCard entry={entry} key={entry.id} onOpen={() => onOpen(entry)} />
            ))}
          </section>
        ))
      ) : (
        <div className="sx-d-stack">
          {shown.map((entry) => (
            <JournalCard entry={entry} key={entry.id} onOpen={() => onOpen(entry)} />
          ))}
        </div>
      )}
    </Parchment>
  )
}
