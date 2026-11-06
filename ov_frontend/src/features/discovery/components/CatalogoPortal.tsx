import { useColeccionIconos } from '../hooks/useIconosObtenidos'
import type { SeccionCatalogo } from '../hooks/useCatalogoServidor'
import { CatalogoServidor } from './CatalogoServidor'
import { DetalleCarreraServidor } from './DetalleCarreraServidor'
import { DetalleInstitucionServidor } from './DetalleInstitucionServidor'
import { DetalleOcupacionServidor } from './DetalleOcupacionServidor'
import { DiscoveryStage } from './DiscoveryStage'
import '../styles/catalogo-portal.css'

// Ajuste catalogo-apoderado: «Explorar opciones» del apoderado y de la orientadora. Es el catálogo del estudiante
// (api), en modo lectura y con la variante del portal: un listado por pestaña o el detalle de un código.
export function CatalogoPortal({ section, codigo }: { section: SeccionCatalogo; codigo?: string }) {
  const iconos = useColeccionIconos()
  if (codigo === undefined)
    return (
      <DiscoveryStage ambient="atlas" variante="portal">
        <CatalogoServidor
          section={section}
          obtenido={iconos.obtenido}
          iconosRevelados={null}
          variante="portal"
        />
      </DiscoveryStage>
    )
  if (section === 'careers') return <DetalleCarreraServidor codigo={codigo} variante="portal" />
  if (section === 'professions') return <DetalleOcupacionServidor codigo={codigo} variante="portal" />
  return <DetalleInstitucionServidor codigo={codigo} variante="portal" />
}
