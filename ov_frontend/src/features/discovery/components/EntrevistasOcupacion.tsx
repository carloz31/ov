import { Link } from 'react-router'
import { Parchment } from '@/components/student/Parchment'
import { useAdventure } from '@/store/adventureStore'
import { useDiscovery } from '@/store/discoveryStore'
import { appPaths } from '@/routes/paths'
import { discoveryPaths } from '@/routes/discoveryPaths'
import { demoOccupationByVideo } from '@/data/content/research'
import { getClassroomInterviews } from '../lib/research'

// Las entrevistas del salón sobre una ocupación, en local (en api, `EntrevistasOcupacionServidor`, F09).
export function EntrevistasOcupacion({ codigo }: { codigo: string }) {
  const discovery = useDiscovery(),
    adventure = useAdventure()
  const videos = getClassroomInterviews(adventure).filter(
    (v) =>
      (discovery.publishedResearch.find((r) => r.videoId === v.id)?.occupationId ??
        demoOccupationByVideo[v.id]) === codigo,
  )
  return (
    <Parchment title="Entrevistas de tu salón">
      {videos.length ? (
        videos.map((v) => (
          <Link
            key={v.id}
            className="sx-d-related"
            to={`${appPaths.student.research}?entrevista=${encodeURIComponent(v.id)}`}
          >
            <strong>{v.title}</strong>
            <small>
              Por {v.alias}
              {!discovery.publishedResearch.some((r) => r.videoId === v.id) && ' · Relación de demostración'}
            </small>
          </Link>
        ))
      ) : (
        <>
          <p>Nadie de tu salón la ha investigado todavía.</p>
          <Link className="sx-d-action" to={`${discoveryPaths.researchGuide}?occupationId=${encodeURIComponent(codigo)}`}>
            Investigarla
          </Link>
        </>
      )}
    </Parchment>
  )
}
