import type { ReactNode } from 'react'
import { CatalogNavigation } from './CatalogNavigation'
import { useDiscoveryError } from '@/store/discoveryStore'
import { useExplorationError } from '@/store/explorationStore'
import '@/styles/student/discovery.css'

export function DiscoveryStage({
  ambient,
  children,
}: {
  ambient: 'profile' | 'plans' | 'research' | 'atlas' | 'backpack' | 'journal'
  children: ReactNode
}) {
  const discoveryError = useDiscoveryError()
  const explorationError = useExplorationError()
  return (
    <div className="sx-discovery" data-ambient={ambient}>
      <div className="sx-d-container">
        {ambient === 'atlas' && <CatalogNavigation />}
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
