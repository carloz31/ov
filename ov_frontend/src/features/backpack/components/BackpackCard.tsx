import {
  BookOpen,
  Compass,
  Flame,
  Languages,
  LockKeyhole,
  MessageSquareQuote,
  Play,
  ScrollText,
  Sparkles,
  type LucideIcon,
} from 'lucide-react'

import { activities } from '@/data/activities/content'
import { type TravelResource } from '@/features/backpack/lib/travelerResources'
import { studentResourceRequirement as resourceRequirement } from '@/features/backpack/lib/challengeResources'
import { cityCases } from '@/data/content/adventure'

import { FavoriteButton } from '@/components/student/FavoriteButton'

const resourceIcons: Record<TravelResource['icon'], LucideIcon> = {
  compass: Compass,
  scroll: ScrollText,
  book: BookOpen,
  sparkles: Sparkles,
  quote: MessageSquareQuote,
  flame: Flame,
  languages: Languages,
}

export function BackpackCard({
  resource,
  unlocked,
  saved,
  visited,
  playable,
  onOpen,
  onFavorite,
  onRequirement,
}: {
  resource: TravelResource
  unlocked: boolean
  saved: boolean
  visited: boolean
  playable: boolean
  onOpen: () => void
  onFavorite: () => void
  onRequirement: () => void
}) {
  const Icon = resourceIcons[resource.icon],
    requirement = resourceRequirement(resource)
  const activity =
    'activityId' in resource.requirement
      ? activities.find(
          (a) =>
            a.id === ('activityId' in resource.requirement ? resource.requirement.activityId : undefined),
        )
      : undefined
  const call =
    'caseId' in resource.requirement
      ? cityCases.find(
          (c) => c.id === ('caseId' in resource.requirement ? resource.requirement.caseId : undefined),
        )
      : undefined
  const [name, role] = resource.author?.split(' · ') ?? []
  return (
    <article
      className={`sx-b-card ${resource.kind === 'sheet' ? 'sx-b-sheet' : 'sx-b-voice'} ${unlocked ? 'sx-b-unlocked' : 'sx-b-locked'}`}
      data-icon={resource.icon}
    >
      {unlocked && <FavoriteButton compact icon="star" selected={saved} onToggle={onFavorite} />}
      {resource.kind === 'sheet' ? (
        <>
          <div className="sx-b-object" aria-hidden="true">
            <div className="sx-b-scroll">
              <Icon size={32} />
            </div>
            {!unlocked && <LockKeyhole className="sx-b-object-lock" size={32} />}
          </div>
          {unlocked && !visited && <span className="sx-b-new">Nueva</span>}
          <h3>{resource.title}</h3>
          {unlocked ? (
            <>
              <p>{resource.summary}</p>
              <p className="sx-b-origin">
                Obtenida en{' '}
                <strong>
                  {activity?.titulo ??
                    ('activityId' in resource.requirement ? resource.requirement.activityId : 'el camino')}
                </strong>
              </p>
              <button type="button" className="sx-d-action sx-b-open-sheet" onClick={onOpen}>
                Abrir ficha
              </button>
            </>
          ) : (
            <>
              <p>
                <LockKeyhole aria-hidden="true" size={16} /> Bloqueado · {requirement.text}
              </p>
              <button type="button" className="sx-d-action sx-d-action-ghost" onClick={onRequirement}>
                {requirement.label}
              </button>
            </>
          )}
        </>
      ) : unlocked ? (
        <>
          <div className="sx-b-author">
            <span>
              {name
                ?.split(' ')
                .slice(0, 2)
                .map((n) => n[0])
                .join('') ?? 'VO'}
            </span>
            <div>
              <strong>{name}</strong>
              <p>{role}</p>
            </div>
          </div>
          <h3>{resource.title}</h3>
          <blockquote>“{resource.summary}”</blockquote>
          <p>
            Te la regaló el llamado <strong>{call?.title ?? 'de la ciudad'}</strong>
          </p>
          <button type="button" className="sx-d-action sx-d-action-gold" onClick={onOpen}>
            <Play aria-hidden="true" size={18} />
            Escuchar su historia
          </button>
        </>
      ) : (
        <>
          <div className="sx-b-voice-mist" aria-hidden="true">
            <span className="sx-b-silhouette" />
            <LockKeyhole size={56} />
          </div>
          <p className="sx-b-voice-label">Una voz por descubrir</p>
          <h3>{resource.title}</h3>
          <p>{resource.summary}</p>
          <div className="sx-b-requirement">{requirement.text}</div>
          {playable ? (
            <button type="button" className="sx-d-action sx-d-action-ghost" onClick={onRequirement}>
              Ir a la Central de Casos
            </button>
          ) : (
            <p className="sx-b-coming">Este llamado llega pronto</p>
          )}
        </>
      )}
    </article>
  )
}
