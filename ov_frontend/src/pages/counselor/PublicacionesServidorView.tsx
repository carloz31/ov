import { AvisoPublicaciones } from '@/features/counselor/components/publicaciones/AvisoPublicaciones'
import { TablaPublicaciones } from '@/features/counselor/components/publicaciones/TablaPublicaciones'
import { usePublicacionesServidor } from '@/features/counselor/hooks/usePublicacionesServidor'

// F09 (api, boceto 12): la tabla de publicaciones de la orientadora.
export function PublicacionesServidorView() {
  const m = usePublicacionesServidor()
  return (
    <>
      <TablaPublicaciones m={m} />
      <AvisoPublicaciones />
    </>
  )
}
