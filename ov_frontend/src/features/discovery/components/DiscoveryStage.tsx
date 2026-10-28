import type { ReactNode } from 'react'
import { CatalogNavigation } from './CatalogNavigation'
import { useDiscoveryError } from '@/store/discoveryStore'
import { useExplorationError } from '@/store/explorationStore'
import '@/styles/student/discovery.css'

export function DiscoveryStage({
  ambient,
  children,
  navegacion = true,
  variante = 'estudiante',
}: {
  ambient: 'profile' | 'plans' | 'research' | 'atlas' | 'backpack' | 'journal'
  children: ReactNode
  // Ajuste catalogo-datos-reales: los detalles del catálogo del servidor no llevan las pestañas del atlas.
  navegacion?: boolean
  // Ajuste catalogo-apoderado: el catálogo del portal (apoderado, orientadora) con el estilo claro del portal.
  variante?: 'estudiante' | 'portal'
}) {
  const discoveryError = useDiscoveryError()
  const explorationError = useExplorationError()
  return (
    <div
      className="sx-discovery"
      data-ambient={ambient}
      data-variante={variante === 'portal' ? 'portal' : undefined}
    >
      <div className="sx-d-container">
        {ambient === 'atlas' && navegacion && <CatalogNavigation />}
        {(discoveryError || explorationError) && (
          <p role="alert" className="sx-d-warning">
            No se pudo guardar en este navegador. Tus cambios siguen disponibles durante esta sesión; evita
            recargar hasta permitir el almacenamiento.
          </p>
        )}
        {children}
      </div>
    </div>
  )
}
