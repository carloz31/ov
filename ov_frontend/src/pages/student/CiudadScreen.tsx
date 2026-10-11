import { ForestFireCaseProgress } from '@/features/cases/components/ForestFireCaseProgress'
import { JournalEntryCard } from '@/features/journal/components/JournalEntryCard'
import { useCityAccess } from '@/features/adventure/hooks/useCityAccess'
import { MaraInteractionPlayer } from '@/features/activities/components/MaraInteractionPlayer'
import { ChallengePlayer } from '@/features/activities/components/challenges/ChallengePlayer'
import { StudentActivityPlayer } from '@/features/activities/components/StudentActivityPlayer'
import { getCiudadPoints } from '@/features/adventure/lib/ciudadPoints'
import { MapScreenLayout } from '@/features/adventure/components/MapScreenLayout'
import '@/styles/student/journey.css'
export function CiudadScreen() {
  const { adventure, journey, params, setParams, interaccion, challenge, activity } = useCityAccess()
  if (interaccion)
    return (
      <div className="sx-player-host">
        <MaraInteractionPlayer
          key={interaccion.clave}
          codigo={interaccion.codigo}
          revision={params.get('revision') === '1'}
          onClose={() => setParams({})}
        />
      </div>
    )
  if (challenge)
    return <ChallengePlayer key={challenge.id} challenge={challenge} onClose={() => setParams({})} />
  if (activity)
    return (
      <div className="sx-player-host">
        <StudentActivityPlayer
          activity={activity}
          imageUrl="/images/background/afueras.png"
          direct={params.get('modo') === 'directa'}
          onClose={() => setParams({})}
        />
      </div>
    )
  return (
    <MapScreenLayout
      renderCaseProgress={(adventure) => <ForestFireCaseProgress adventure={adventure} />}
      renderJournal={(journal, onOpen) => (
        <JournalEntryCard completed={journal.completed} prompt={journal.prompt} onOpen={onOpen} />
      )}
      zone="central"
      points={getCiudadPoints(adventure, journey)}
      adventure={adventure}
      journey={journey}
    />
  )
}
