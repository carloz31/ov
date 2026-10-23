import type { ReactNode } from 'react'
import { useJournalHome } from '@/features/journal/hooks/useJournalHome'
import { ArrowRight, LockKeyhole, Search, Sparkles } from 'lucide-react'
import { type LumiSuggestion } from '@/features/journal/lib/lumiSuggestions'
import { LumiPortrait } from '@/features/journal/components/LumiPortrait'
import type { JournalEntry } from '@/types/adventure'
import { Parchment } from '@/components/student/Parchment'
import { type LumiBond } from '@/features/journal/lib/lumiBond'
import { LumiBondPanel } from '@/features/journal/components/LumiBondPanel'
import {
  DailyQuestionCard,
  type DailyQuestionEditorContext,
} from '@/features/journal/components/DailyQuestionCard'
import { JournalTags } from '@/features/journal/components/JournalTags'
import { JournalCard } from '@/features/journal/components/JournalCard'
import { JournalOnboarding } from '@/features/journal/components/JournalOnboarding'
import { JournalTab } from '@/features/journal/components/JournalTab'
import type { CartaLumi } from '@/lib/servidor/adaptadoresDiario'
// F05, solo en api: las cartas del servidor (sin «Después de»: el servidor no dice qué actividad la abrió).
export type CartasServidor = {
  cartas: CartaLumi[]
  porDescubrir: number
  onCarta: (carta: CartaLumi) => void
}
type JournalGrouping = 'timeline' | 'topics'
export function JournalHome({
  entries,
  grouping,
  onChangeGrouping,
  onSuggested,
  onNew,
  onOpen,
  query,
  setQuery,
  bond,
  onboarding,
  onBegin,
  now,
  onDailyQuestion,
  mostrarTemas = true,
  cartasServidor,
  dailyQuestion,
}: {
  entries: JournalEntry[]
  grouping: JournalGrouping
  onChangeGrouping: (grouping: JournalGrouping) => void
  onSuggested: (suggestion: LumiSuggestion) => void
  onNew: () => void
  onOpen: (entry: JournalEntry) => void
  query: string
  setQuery: (query: string) => void
  bond: LumiBond
  onboarding: boolean
  onBegin: () => void
  now: Date
  onDailyQuestion: (context: DailyQuestionEditorContext) => void
  // F05: en api no hay temas (pestaña «Por tema», filtros ni buscador).
  mostrarTemas?: boolean
  cartasServidor?: CartasServidor
  // La tarjeta del día la arma la vista (en api lee el servidor); sin ella, la local.
  dailyQuestion?: ReactNode
}) {
  const { topic, setTopic, suggestions, unread, tags, shown, months } = useJournalHome({
    entries,
    grouping,
    bond,
  })
  return (
    <>
      <header className="sx-d-header">
        <div>
          <p className="sx-j-private">
            <LockKeyhole size={16} aria-hidden="true" />
            Solo tú puedes leer este espacio
          </p>
          <h1>Mi diario</h1>
          <p>Cuéntale a tu compañera de viaje lo que vas descubriendo de ti.</p>
        </div>
      </header>
      <div className="sx-j-layout">
        <LumiBondPanel bond={bond} />
        <div className="sx-d-stack">
          {onboarding ? (
            <JournalOnboarding onBegin={onBegin} />
          ) : (
            <Parchment
              className="sx-j-notebook sx-j-blank"
              label="Página en blanco"
              title="Lumi, hoy quiero contarte…"
            >
              <p>Algo que te pasó, una duda o una idea. No necesitas completar una actividad para empezar.</p>
              <button className="sx-d-action" type="button" onClick={onNew}>
                Conversación libre <ArrowRight aria-hidden="true" size={18} />
              </button>
            </Parchment>
          )}
          {!onboarding &&
            (dailyQuestion ?? (
              <DailyQuestionCard now={now} onRespond={onDailyQuestion} onOpenAnswer={onOpen} />
            ))}
          {unread && (
            <div className="sx-j-memory-notice" role="status">
              <span className="sx-j-lumi">
                <LumiPortrait />
              </span>
              <div>
                <h2>Lumi recordó algo nuevo</h2>
                <p>Tu amistad creció y se abrió un recuerdo. Búscalo junto a tu amistad con Lumi.</p>
              </div>
            </div>
          )}
          <section aria-label="Cartas de Lumi por responder">
            <h2 className="sx-j-letters-heading">
              Cartas de Lumi por responder <span>{cartasServidor?.cartas.length ?? suggestions.length}</span>
            </h2>
            <p>Después de cada actividad, Lumi te deja una pregunta sobre lo que viviste.</p>
            <div className="sx-j-letters">
              {cartasServidor ? (
                cartasServidor.cartas.length ? (
                  cartasServidor.cartas.map((carta) => (
                    <Parchment key={carta.codigo} className="sx-j-letter">
                      <span className="sx-j-letter-seal">
                        <Sparkles aria-hidden="true" size={16} />
                      </span>
                      <p className="sx-j-question">Lumi: “{carta.nombre}”</p>
                      <button
                        type="button"
                        className="sx-d-action"
                        onClick={() => cartasServidor.onCarta(carta)}
                      >
                        Responder a Lumi
                      </button>
                    </Parchment>
                  ))
                ) : (
                  <p className="sx-j-empty">
                    Respondiste todas las cartas. Lumi te dejará otra al terminar tu próxima actividad.
                  </p>
                )
              ) : suggestions.length ? (
                suggestions.map((item) => (
                  <Parchment key={item.activityId} className="sx-j-letter">
                    <span className="sx-j-letter-seal">
                      <Sparkles aria-hidden="true" size={16} />
                    </span>
                    <p className="sx-d-eyebrow">Después de: {item.title}</p>
                    <p className="sx-j-question">Lumi: “{item.prompt}”</p>
                    <JournalTags tags={item.tags} />
                    <button type="button" className="sx-d-action" onClick={() => onSuggested(item)}>
                      Responder a Lumi
                    </button>
                  </Parchment>
                ))
              ) : (
                <p className="sx-j-empty">
                  Respondiste todas las cartas. Lumi te dejará otra al terminar tu próxima actividad.
                </p>
              )}
            </div>
            {!!cartasServidor?.porDescubrir && <p>{cartasServidor.porDescubrir} entradas por descubrir</p>}
          </section>
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
                  Este espacio está listo cuando quieras usarlo. No hace falta esperar a que algo importante
                  pase.
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
        </div>
      </div>
    </>
  )
}
