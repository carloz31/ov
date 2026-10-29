import { AvisoPublicaciones } from '@/features/counselor/components/publicaciones/AvisoPublicaciones'
import { DetallePublicacion } from '@/features/counselor/components/publicaciones/DetallePublicacion'
import { usePublicacionDetalle } from '@/features/counselor/hooks/usePublicacionDetalle'
import { nombreSalon } from '@/features/counselor/hooks/usePublicacionesServidor'

// F09 (api, boceto 12b): el detalle de una publicación para la orientadora.
export function PublicacionServidorView() {
  const m = usePublicacionDetalle()
  return (
    <>
      <DetallePublicacion m={m} nombreSalon={nombreSalon} />
      <AvisoPublicaciones />
    </>
  )
}
