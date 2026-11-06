import { DiscoveryStage } from '@/features/discovery/components/DiscoveryStage'
import { AsistenteGuion } from '@/features/discovery/components/investigaciones/AsistenteGuion'

// F09 (api): el asistente del guion de una investigación (bocetos 09–11).
export function StudentGuionInvestigacionView() {
  return (
    <DiscoveryStage ambient="research">
      <AsistenteGuion />
    </DiscoveryStage>
  )
}
