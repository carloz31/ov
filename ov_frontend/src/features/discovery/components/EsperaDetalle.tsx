import { useNavigate } from 'react-router'
import { PantallaCarga } from '@/components/student/PantallaCarga'
import { PantallaCargaPortal } from '@/components/staff/PantallaCargaPortal'
import { useModoCatalogo } from '../hooks/useModoCatalogo'
import { DiscoveryStage } from './DiscoveryStage'
import { MissingAtlasPage } from './MissingAtlasPage'

// F06: mientras llega el detalle del servidor, o si falló; un código que no existe muestra la página perdida.
// Ajuste catalogo-apoderado: en el portal, la espera es la de las secciones del portal (`PantallaCargaPortal`).
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
      ) : variante === 'portal' ? (
        <PantallaCargaPortal
          estado={error ? 'error' : 'cargando'}
          mensaje={error ?? undefined}
          onReintentar={onReintentar}
          enSeccion
        />
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
