import {
  BookOpen,
  Compass,
  Flame,
  Languages,
  LockKeyhole,
  MessageSquareQuote,
  ScrollText,
  Sparkles,
  type LucideIcon,
} from 'lucide-react'

import { activities } from '@/data/activities/content'
import { type TravelResource } from '@/features/backpack/lib/travelerResources'
import { studentResourceRequirement as resourceRequirement } from '@/features/backpack/lib/challengeResources'
import { cityCases } from '@/data/content/adventure'

import { FavoriteButton } from '@/components/student/FavoriteButton'
import { TarjetaTestimonio } from '@/components/student/TarjetaTestimonio'
import { VozPorDescubrir } from '@/components/student/VozPorDescubrir'

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
      ) : resource.servidor ? (
        <TestimonioServidor
          resource={resource}
          unlocked={unlocked}
          requisito={requirement.text}
          onOpen={onOpen}
          onRequirement={onRequirement}
        />
      ) : unlocked ? (
        <TarjetaTestimonio
          nombre={name}
          rol={role}
          titulo={resource.title}
          cita={resource.summary}
          regalo={call?.title ?? 'de la ciudad'}
          onEscuchar={onOpen}
        />
      ) : (
        <>
          <VozPorDescubrir titulo={resource.title} intriga={resource.summary} requisito={requirement.text} />
          {playable && (
            <button type="button" className="sx-d-action sx-d-action-ghost" onClick={onRequirement}>
              Ir a la Central de Casos
            </button>
          )}
        </>
      )}
    </article>
  )
}

// Ajustes Central (7): testimonio del servidor con la tarjeta del prototipo. Bloqueado, toda la tarjeta abre el
// pop up de requisito (como las fichas bloqueadas, F04), que dice qué misión lo desbloquea.
function TestimonioServidor({
  resource,
  unlocked,
  requisito,
  onOpen,
  onRequirement,
}: {
  resource: TravelResource
  unlocked: boolean
  requisito: string
  onOpen: () => void
  onRequirement: () => void
}) {
  const [nombre, rol] = resource.author?.split(' · ') ?? []
  return unlocked ? (
    <TarjetaTestimonio
      nombre={nombre}
      rol={rol}
      titulo={resource.title}
      cita={resource.summary}
      regalo={resource.servidor?.caso?.titulo ?? 'de la ciudad'}
      onEscuchar={onOpen}
    />
  ) : (
    <button type="button" className="sx-b-voice-locked" onClick={onRequirement}>
      <VozPorDescubrir titulo={resource.title} intriga={resource.summary} requisito={requisito} />
      <span className="sr-only">Bloqueado. Ver cómo conocer este testimonio.</span>
    </button>
  )
}
