import { DiscoveryStage } from '@/features/discovery/components/DiscoveryStage'
import { PublicarEntrevista } from '@/features/discovery/components/investigaciones/PublicarEntrevista'

// F09 (api): publicar una entrevista o editar su ficha (boceto 04).
export function StudentPublicarEntrevistaView() {
  return (
    <DiscoveryStage ambient="research">
      <PublicarEntrevista />
    </DiscoveryStage>
  )
}
