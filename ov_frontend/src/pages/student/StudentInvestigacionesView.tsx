import { DiscoveryStage } from '@/features/discovery/components/DiscoveryStage'
import { InvestigacionesServidor } from '@/features/discovery/components/investigaciones/InvestigacionesServidor'

// F09 (api): Investigaciones con los datos del servidor (bocetos 01–03).
export function StudentInvestigacionesView() {
  return (
    <DiscoveryStage ambient="research">
      <InvestigacionesServidor />
    </DiscoveryStage>
  )
}
