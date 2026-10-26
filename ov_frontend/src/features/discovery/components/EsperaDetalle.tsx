import { useNavigate } from 'react-router'
import { PantallaCarga } from '@/components/student/PantallaCarga'
import { appPaths } from '@/routes/paths'
import { DiscoveryStage } from './DiscoveryStage'
import { MissingAtlasPage } from './MissingAtlasPage'

// F06: mientras llega el detalle del servidor, o si falló; un código que no existe muestra la página perdida.
export function EsperaDetalle({
  noExiste,
  error,
  onReintentar,
}: {
  noExiste: boolean
  error: string | null
  onReintentar: () => void
}) {
  const navigate = useNavigate()
  return (
    <DiscoveryStage ambient="atlas">
      {noExiste ? (
        <MissingAtlasPage />
      ) : (
        <PantallaCarga
          estado={error ? 'error' : 'cargando'}
          titulo="Abriendo el atlas"
          frase="Lumi está buscando esta página…"
          mensaje={error ?? undefined}
          onReintentar={onReintentar}
          volver={{ texto: 'Volver al catálogo', onClick: () => navigate(appPaths.student.catalog.professions) }}
          enSeccion
        />
      )}
    </DiscoveryStage>
  )
}
