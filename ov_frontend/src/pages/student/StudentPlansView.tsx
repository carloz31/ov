import { DiscoveryStage } from '@/features/discovery/components/DiscoveryStage'
import { MisPlanesLocales } from '@/features/discovery/components/MisPlanesLocales'
import { MisPlanes } from '@/features/plans/components/MisPlanes'
import { usaTarjetaV4 } from '@/features/plans/lib/tarjeta'

// F07a: en api, Mis planes con los planes del servidor (tarjeta v4); en local, como antes.
export function StudentPlansView() {
  return usaTarjetaV4() ? (
    <DiscoveryStage ambient="plans">
      <MisPlanes />
    </DiscoveryStage>
  ) : (
    <MisPlanesLocales />
  )
}
