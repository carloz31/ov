import { Compass } from 'lucide-react'
import { useNavigate } from 'react-router'
import { useOccupationExplorationContext } from '@/context/occupationExplorationContext'
import { getDiscovery } from '@/store/discoveryStore'
import { discoveryPaths } from '@/routes/discoveryPaths'
import { careerDetails, occupationDetails } from '../lib/catalogDetails'
import { chooseUnexpected } from '../lib/unexpected'
import { Parchment } from '@/components/student/Parchment'
export function UnexpectedPlace({ kind, currentId }: { kind: 'career' | 'occupation'; currentId: string }) {
  const context = useOccupationExplorationContext()
  const navigate = useNavigate()
  const planIds = context.decisionSheets.flatMap((s) => (s.sourceId ? [s.sourceId] : []))
  function go() {
    const excluded =
      kind === 'career'
        ? [...context.careerInterestIds, ...planIds]
        : [
            ...context.profiles.filter((p) => p.interested).map((p) => p.occupationId),
            ...occupationDetails
              .filter((o) => o.careerIds.some((id) => planIds.includes(id)))
              .map((o) => o.id),
          ]
    const destination = chooseUnexpected({
      kind,
      currentId,
      careers: careerDetails,
      occupations: occupationDetails,
      visits: getDiscovery().catalogVisits,
      excluded,
    })
    if (destination)
      navigate(
        kind === 'career' ? discoveryPaths.career(destination.id) : discoveryPaths.occupation(destination.id),
        { state: { revisitingCatalog: destination.revisiting } },
      )
  }
  const eligible = (kind === 'career' ? careerDetails : occupationDetails).some(
    (c) =>
      c.id !== currentId &&
      !(kind === 'career'
        ? [...context.careerInterestIds, ...planIds].includes(c.id)
        : context.profiles.some((p) => p.occupationId === c.id && p.interested) ||
          ('careerIds' in c && c.careerIds.some((id) => planIds.includes(id)))),
  )
  return (
    <Parchment className="sx-unexpected-place">
      <p>¿Te animas a descubrir algo que aún no has visto?</p>
      <button type="button" className="sx-d-action sx-d-action-ghost" disabled={!eligible} onClick={go}>
        <Compass size={20} aria-hidden="true" />
        Llévame a un lugar inesperado
      </button>
      {!eligible && <p>Las otras opciones están en tus favoritos o en tus planes.</p>}
    </Parchment>
  )
}
