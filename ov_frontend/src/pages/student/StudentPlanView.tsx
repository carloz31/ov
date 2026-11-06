import { Navigate, useLocation, useParams, useSearchParams } from 'react-router'
import { DiscoveryStage } from '@/features/discovery/components/DiscoveryStage'
import { PlanAbierto } from '@/features/plans/components/PlanAbierto'
import type { EstadoNavegacionPlan } from '@/features/plans/hooks/useAccionesPlanes'
import { usaTarjetaV4 } from '@/features/plans/lib/tarjeta'
import { appPaths } from '@/routes/paths'

// F07a: un plan abierto (tarjeta v4, solo en api); en local no existe y vuelve a Mis planes.
export function StudentPlanView() {
  const { carrera = '' } = useParams()
  const [busqueda] = useSearchParams()
  const estado = useLocation().state as EstadoNavegacionPlan | null
  if (!usaTarjetaV4()) return <Navigate replace to={appPaths.student.decisions} />
  return (
    <DiscoveryStage ambient="plans">
      <PlanAbierto
        key={carrera}
        carrera={carrera}
        seccion={busqueda.get('seccion')}
        avisoInicial={estado?.aviso}
      />
    </DiscoveryStage>
  )
}
