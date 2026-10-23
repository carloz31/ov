import { ForestFireCaseProgress } from '@/features/cases/components/ForestFireCaseProgress'
import { JournalEntryCard } from '@/features/journal/components/JournalEntryCard'
import { AdditionalReveal } from '@/features/activities/components/reflection/AdditionalReveal'
import { useEffect } from 'react'
import { useEstadoServidor } from '@/store/servidor/sesion'
import { useSearchParams } from 'react-router'
import { useCaminoActivity } from '@/features/adventure/hooks/useCaminoActivity'
import { useDesafioServidor } from '@/features/adventure/hooks/useDesafioServidor'
import { ChallengePlayer } from '@/features/activities/components/challenges/ChallengePlayer'
import { StudentActivityPlayer } from '@/features/activities/components/StudentActivityPlayer'
import { MaraInteractionPlayer } from '@/features/activities/components/MaraInteractionPlayer'
import { RegistroServidorPlayer } from '@/features/activities/components/RegistroServidorPlayer'
import { EncuentroServidorPlayer } from '@/features/activities/components/EncuentroServidorPlayer'
import { useJourney } from '@/store/journeyStore'
import { useAdventure } from '@/store/adventureStore'
import { getCaminoPoints } from '@/features/adventure/lib/caminoPoints'
import { MapScreenLayout } from '@/features/adventure/components/MapScreenLayout'
import { RegistroPorAmpliar } from '@/features/activities/components/RegistroPorAmpliar'
import { FichasBatalla } from '@/features/activities/components/FichasBatalla'
import '@/styles/student/journey.css'
import { useReflections } from '@/store/reflectionStore'
export function CaminoScreen() {
  useEstadoServidor()
  const adventure = useAdventure()
  const journey = useJourney()
  useReflections()
  const [params, setParams] = useSearchParams()
  const points = getCaminoPoints(adventure, journey)
  const { activity, cuestionario, registro, encuentroConEco } = useCaminoActivity(
    params.get('actividad') ?? '',
  )
  const requestedPoint = activity ? points.find((point) => point.specActivityId === activity.id) : undefined
  const allowed = !!activity && !!requestedPoint && requestedPoint.status !== 'locked'
  const desafio = useDesafioServidor(params.get('actividad') ?? '')
  useEffect(() => {
    if (!params.has('actividad') || allowed || desafio) return
    const next = new URLSearchParams(params)
    next.delete('actividad')
    next.delete('revision')
    if (requestedPoint) next.set('punto', requestedPoint.id)
    setParams(next, { replace: true })
  }, [params, setParams, allowed, requestedPoint, desafio])
  if (desafio)
    return (
      <ChallengePlayer
        key={desafio.servidor.actividad}
        challenge={desafio.challenge}
        servidor={desafio.servidor}
        onClose={() => setParams({})}
      />
    )
  if (activity && allowed && cuestionario)
    return (
      <div className="sx-player-host">
        <MaraInteractionPlayer
          key={activity.id}
          codigo={activity.id}
          revision={params.get('revision') === '1'}
          imageUrl="/images/background/forest.png"
          onClose={() => setParams({})}
        />
      </div>
    )
  if (activity && allowed && encuentroConEco)
    return (
      <div className="sx-player-host">
        <EncuentroServidorPlayer
          key={activity.id}
          codigo={activity.id}
          imageUrl="/images/background/forest.png"
          edit={params.get('revision') === '1'}
          onClose={() => setParams({})}
        />
      </div>
    )
  if (activity && allowed && registro)
    return (
      <div className="sx-player-host">
        <RegistroServidorPlayer
          key={activity.id}
          codigo={activity.id}
          imageUrl="/images/background/forest.png"
          onClose={() => setParams({})}
        />
      </div>
    )
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
      renderCaseProgress={(adventure, actividad) => (
        <ForestFireCaseProgress adventure={adventure} actividad={actividad} />
      )}
      renderPorAmpliar={(codigo) => <RegistroPorAmpliar codigo={codigo} />}
      renderFichasBatalla={(codigo) => <FichasBatalla codigo={codigo} />}
      renderJournal={(journal, onOpen) => (
        <JournalEntryCard
          completed={journal.completed}
          prompt={journal.prompt}
          onOpen={onOpen}
          remitente={journal.remitente}
        />
      )}
      renderAdditional={(props) => <AdditionalReveal {...props} />}
      zone="missions"
      points={points}
      adventure={adventure}
      journey={journey}
    />
  )
}
