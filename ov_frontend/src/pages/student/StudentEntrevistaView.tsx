import { DiscoveryStage } from '@/features/discovery/components/DiscoveryStage'
import { DetalleEntrevista } from '@/features/discovery/components/investigaciones/DetalleEntrevista'

// F09 (api): el detalle de una entrevista (bocetos 05–08).
export function StudentEntrevistaView() {
  return (
    <DiscoveryStage ambient="research">
      <DetalleEntrevista />
    </DiscoveryStage>
  )
}
