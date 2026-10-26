import { Link } from 'react-router'
import { FavoriteButton } from '@/components/student/FavoriteButton'
import { Parchment } from '@/components/student/Parchment'
import { discoveryPaths } from '@/routes/discoveryPaths'
import { lineaInstitucion } from '@/lib/servidor/adaptadoresCatalogo'
import { useDetalleServidor } from '../hooks/useDetalleServidor'
import { AtlasNavigation } from './AtlasNavigation'
import { AvisoFavorito } from './AvisoFavorito'
import { CatalogRevisitNotice } from './CatalogRevisitNotice'
import { DiscoveryStage } from './DiscoveryStage'
import { EsperaDetalle } from './EsperaDetalle'
import { IngresoCarrera } from './IngresoCarrera'
import { PlanDeCarrera } from './PlanDeCarrera'
import { UnexpectedPlace } from './UnexpectedPlace'

// F06: el detalle de carrera en api, con lo que entrega el servidor y el marcado del detalle local.
export function DetalleCarreraServidor({ codigo }: { codigo: string }) {
  const { datos: carrera, favorito, ...estado } = useDetalleServidor('carreras', codigo)
  if (!carrera) return <EsperaDetalle {...estado} onReintentar={estado.reintentar} />
  return (
    <DiscoveryStage ambient="atlas">
      <AtlasNavigation section="careers" />
      <CatalogRevisitNotice />
      <Parchment className="sx-d-dark">
        <div className="sx-d-header">
          <div>
            <p className="sx-d-eyebrow">Carrera</p>
            <h1 className="sx-d-detail-title" tabIndex={-1}>
              {carrera.nombre}
            </h1>
            <p>{[carrera.familia.nombre, carrera.duracion].filter(Boolean).join(' · ')}</p>
          </div>
          <FavoriteButton
            selected={carrera.es_favorita}
            pendiente={favorito.pendiente('carreras', carrera.codigo)}
            onToggle={() => favorito.alternar('carreras', carrera.codigo, !carrera.es_favorita)}
          />
        </div>
      </Parchment>
      <div className="sx-d-detail-grid">
        <main className="sx-d-stack">
          {(carrera.descripcion || carrera.duracion) && (
            <Parchment title="De qué trata">
              {carrera.descripcion && <p>{carrera.descripcion}</p>}
              {carrera.duracion && <span className="sx-d-tag">Duración referencial: {carrera.duracion}</span>}
            </Parchment>
          )}
          {carrera.ingreso && <IngresoCarrera ingreso={carrera.ingreso} />}
          {carrera.ocupaciones.length > 0 && (
            <Parchment title="Ocupaciones a las que conduce">
              <div className="sx-d-two">
                {carrera.ocupaciones.map((o) => (
                  <Link className="sx-d-related" key={o.codigo} to={discoveryPaths.occupation(o.codigo)}>
                    <strong>{o.titulo}</strong>
                  </Link>
                ))}
              </div>
            </Parchment>
          )}
        </main>
        <aside className="sx-d-stack">
          {carrera.instituciones.length > 0 && (
            <Parchment title="Dónde estudiarla">
              {carrera.instituciones.map((i) => (
                <Link className="sx-d-related" key={i.codigo} to={discoveryPaths.institution(i.codigo)}>
                  <strong>{i.nombre}</strong>
                  <small>{lineaInstitucion(i)}</small>
                </Link>
              ))}
              <p>Los costos se consultan en la página de cada institución.</p>
            </Parchment>
          )}
          <PlanDeCarrera nombre={carrera.nombre} codigo={carrera.codigo} />
        </aside>
      </div>
      <UnexpectedPlace kind="career" currentId={carrera.codigo} />
      <AvisoFavorito aviso={favorito.aviso} onDismiss={favorito.cerrarAviso} />
    </DiscoveryStage>
  )
}
