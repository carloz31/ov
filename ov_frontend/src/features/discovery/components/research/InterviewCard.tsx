import { Check, Crown, Mic, Star } from 'lucide-react'
import { occupationCatalog } from '@/data/catalog/occupations'
import { getTravelerLevel, useAdventure } from '@/store/adventureStore'
import { useDiscovery } from '@/store/discoveryStore'
import { demoLevel, interviewDetails, legendIds, receivedReactions } from '@/data/content/research'
import type { InterviewVideo } from '../../lib/research'
export function InterviewCard({
  video,
  own,
  unlocked,
  onOpen,
  onBookmark,
}: {
  video: InterviewVideo
  own: boolean
  unlocked: boolean
  onOpen: () => void
  onBookmark: () => void
}) {
  const discovery = useDiscovery(),
    adventure = useAdventure()
  const publication = discovery.publishedResearch.find((r) => r.videoId === video.id)
  const occupationId = publication?.occupationId
  const name =
    occupationCatalog.find((o) => o.id === occupationId)?.name ??
    interviewDetails[video.id]?.career ??
    video.title
  const authors = publication ? ['Alex', ...publication.coauthors] : video.alias.split(/ y |, | · /)
  const reaction = discovery.reactions[video.id]
  const legendary = legendIds.has(video.id)
  const received = receivedReactions(video.id)
  return (
    <article className="sx-d-parchment sx-d-interview-card">
      <div className="sx-d-illustration">
        <span>
          <Mic aria-hidden="true" />
        </span>
        {legendary && (
          <strong className="sx-d-legend-label">
            <Crown aria-hidden="true" />
            Leyenda
          </strong>
        )}
      </div>
      <div className="sx-d-interview-body">
        <p className="sx-d-eyebrow">Entrevista a</p>
        <h2>{name}</h2>
        {video.title !== name && <p className="sx-d-muted">{video.title}</p>}
        <p>
          {publication?.interviewee ?? interviewDetails[video.id]?.professional ?? 'Profesional entrevistado'}
        </p>
        <p className="sx-d-clamp">
          {unlocked
            ? video.reflection
            : 'Completa una misión de Central de Casos para descubrir esta investigación.'}
        </p>
        <div className="sx-d-authors">
          <span>Por</span>
          {authors.map((alias) => {
            const level = alias === 'Alex' ? getTravelerLevel(adventure) : demoLevel(alias)
            return (
              <span key={alias} className="sx-d-author">
                <span className="sx-d-small-avatar">{alias.slice(0, 2)}</span>
                <span>
                  <strong>{alias}</strong>
                  <small>
                    Nivel {level.number} · {level.label}
                  </small>
                </span>
              </span>
            )
          })}
        </div>
        <div className="sx-d-interview-footer">
          {own ? (
            <small>{received.learned + received.liked} reacciones · Demostración</small>
          ) : (
            unlocked &&
            (reaction?.learned || reaction?.liked) && (
              <small>
                <Check aria-hidden="true" />
                Ya reaccionaste
              </small>
            )
          )}
          {unlocked && <small>{adventure.visits.includes(video.id) ? 'Visto' : 'No visto'}</small>}
          <button type="button" className="sx-d-action sx-d-full" onClick={onOpen}>
            {unlocked ? 'Ver la entrevista' : 'Ir a Central de Casos'}
          </button>
          {unlocked && (
            <button
              type="button"
              className="sx-d-action sx-d-action-ghost"
              aria-pressed={adventure.bookmarks.includes(video.id)}
              onClick={onBookmark}
            >
              <Star aria-hidden="true" />
              {adventure.bookmarks.includes(video.id) ? 'Quitar favorito' : 'Agregar a favoritos'}
            </button>
          )}
        </div>
      </div>
    </article>
  )
}
