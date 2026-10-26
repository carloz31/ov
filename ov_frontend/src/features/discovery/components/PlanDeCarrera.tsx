import { Link } from 'react-router'
import { useOccupationExplorationContext } from '@/context/occupationExplorationContext'
import { Parchment } from '@/components/student/Parchment'
import { useDiscovery } from '@/store/discoveryStore'
import { appPaths } from '@/routes/paths'
import { createPlanFromCareer, getOrderedPlans } from '../lib/plans'

// La carrera en los planes del estudiante (locales hasta F07): su plan o la invitación a crearlo.
export function PlanDeCarrera({ nombre, codigo }: { nombre: string; codigo: string }) {
  const context = useOccupationExplorationContext(),
    discovery = useDiscovery()
  const plans = getOrderedPlans(context.decisionSheets, discovery.planOrder),
    position = plans.findIndex((p) => p.sourceId === codigo)
  const activeCount = context.decisionSheets.filter((s) => s.status !== 'archived').length
  return position >= 0 ? (
    <Parchment title="En tus planes" className="sx-d-highlight">
      <p>Ya es tu Plan {'ABC'[position]}.</p>
      <Link className="sx-d-action" to={appPaths.student.decisions}>
        Ver mi tarjeta
      </Link>
    </Parchment>
  ) : (
    activeCount < 3 && (
      <Parchment title="¿Y si la conviertes en un plan?" className="sx-d-highlight">
        <button
          type="button"
          className="sx-d-action sx-d-action-gold"
          onClick={() => createPlanFromCareer(nombre, codigo)}
        >
          Hacer mi plan {'ABC'[plans.length]}
        </button>
      </Parchment>
    )
  )
}
