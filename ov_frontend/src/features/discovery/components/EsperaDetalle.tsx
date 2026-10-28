import { useNavigate } from 'react-router'
import { PantallaCarga } from '@/components/student/PantallaCarga'
import { useModoCatalogo } from '../hooks/useModoCatalogo'
import { DiscoveryStage } from './DiscoveryStage'
import { MissingAtlasPage } from './MissingAtlasPage'

// F06: mientras llega el detalle del servidor, o si falló; un código que no existe muestra la página perdida.
export function EsperaDetalle({
  noExiste,
  error,
  onReintentar,
  variante,
}: {
  noExiste: boolean
  error: string | null
  onReintentar: () => void
  variante?: 'estudiante' | 'portal'
}) {
  const navigate = useNavigate()
  const { rutas } = useModoCatalogo()
  return (
    <DiscoveryStage ambient="atlas" variante={variante}>
      {noExiste ? (
        <MissingAtlasPage />
      ) : (
        <PantallaCarga
          estado={error ? 'error' : 'cargando'}
          titulo="Abriendo el atlas"
          frase="Lumi está buscando esta página…"
          mensaje={error ?? undefined}
          onReintentar={onReintentar}
          volver={{ texto: 'Volver al catálogo', onClick: () => navigate(rutas.catalog.professions) }}
          enSeccion
        />
      )}
    </DiscoveryStage>
  )
}
