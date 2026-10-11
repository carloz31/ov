import { ForestFireCaseProgress } from '@/features/cases/components/ForestFireCaseProgress'
import { JournalEntryCard } from '@/features/journal/components/JournalEntryCard'
import { AdditionalReveal } from '@/features/activities/components/reflection/AdditionalReveal'
import { useEffect } from 'react'
import { useEstadoServidor } from '@/store/servidor/sesion'
import { useSearchParams } from 'react-router'
import { useCaminoActivity } from '@/features/adventure/hooks/useCaminoActivity'
import { StudentActivityPlayer } from '@/features/activities/components/StudentActivityPlayer'
import { useJourney } from '@/store/journeyStore'
import { useAdventure } from '@/store/adventureStore'
import { getCaminoPoints } from '@/features/adventure/lib/caminoPoints'
import { MapScreenLayout } from '@/features/adventure/components/MapScreenLayout'
import '@/styles/student/journey.css'
import { useReflections } from '@/store/reflectionStore'
export function CaminoScreen() {
  useEstadoServidor()
  const adventure = useAdventure()
  const journey = useJourney()
  useReflections()
  const [params, setParams] = useSearchParams()
  const points = getCaminoPoints(adventure, journey)
  const activity = useCaminoActivity(params.get('actividad') ?? '')
  const requestedPoint = activity ? points.find((point) => point.specActivityId === activity.id) : undefined
  const allowed = !!activity && !!requestedPoint && requestedPoint.status !== 'locked'
  useEffect(() => {
    if (!params.has('actividad') || allowed) return
    const next = new URLSearchParams(params)
    next.delete('actividad')
    next.delete('revision')
    if (requestedPoint) next.set('punto', requestedPoint.id)
    setParams(next, { replace: true })
  }, [params, setParams, allowed, requestedPoint])
  if (activity && allowed)
    return (
      <div className="sx-player-host">
        <StudentActivityPlayer
          key={activity.id}
          activity={activity}
          imageUrl="/images/background/forest.png"
          edit={params.get('revision') === '1'}
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
      renderAdditional={(props) => <AdditionalReveal {...props} />}
      zone="missions"
      points={points}
      adventure={adventure}
      journey={journey}
    />
  )
}
