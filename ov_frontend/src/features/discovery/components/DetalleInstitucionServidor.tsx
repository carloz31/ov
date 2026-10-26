import { Link } from 'react-router'
import { ExternalLink, MapPin } from 'lucide-react'
import { FavoriteButton } from '@/components/student/FavoriteButton'
import { Parchment } from '@/components/student/Parchment'
import { discoveryPaths } from '@/routes/discoveryPaths'
import { appPaths } from '@/routes/paths'
import { lineaInstitucion } from '@/lib/servidor/adaptadoresCatalogo'
import { useDetalleServidor } from '../hooks/useDetalleServidor'
import { AtlasNavigation } from './AtlasNavigation'
import { AvisoFavorito } from './AvisoFavorito'
import { DiscoveryStage } from './DiscoveryStage'
import { EsperaDetalle } from './EsperaDetalle'

// F06: el detalle de institución en api; la ubicación es la del servidor (sin dirección ni distrito).
export function DetalleInstitucionServidor({ codigo }: { codigo: string }) {
  const { datos: institucion, favorito, ...estado } = useDetalleServidor('instituciones', codigo)
  if (!institucion) return <EsperaDetalle {...estado} onReintentar={estado.reintentar} />
  const carreras = [...institucion.carreras].sort((a, b) => Number(b.es_favorita) - Number(a.es_favorita))
  return (
    <DiscoveryStage ambient="atlas">
      <AtlasNavigation section="institutions" />
      <Parchment className="sx-d-dark">
        <div className="sx-d-header">
          <div>
            <p className="sx-d-eyebrow">Institución</p>
            <h1 className="sx-d-detail-title" tabIndex={-1}>
              {institucion.nombre}
            </h1>
            <p>{lineaInstitucion(institucion)}</p>
          </div>
          <FavoriteButton
            selected={institucion.es_favorita}
            pendiente={favorito.pendiente('instituciones', institucion.codigo)}
            onToggle={() => favorito.alternar('instituciones', institucion.codigo, !institucion.es_favorita)}
          />
        </div>
      </Parchment>
      <div className="sx-d-detail-grid">
        <main className="sx-d-stack">
          {institucion.descripcion && (
            <Parchment title="Sobre la institución">
              <p>{institucion.descripcion}</p>
            </Parchment>
          )}
          <Parchment title="Carreras que ofrece">
            <p>Tus carreras favoritas aparecen primero.</p>
            <div className="sx-d-two">
              {carreras.map((c) => (
                <Link className="sx-d-related" key={c.codigo} to={discoveryPaths.career(c.codigo)}>
                  <strong>{c.nombre}</strong>
                  <small>{c.familia.nombre}</small>
                  {c.es_favorita && <span>Favorita</span>}
                </Link>
              ))}
            </div>
          </Parchment>
        </main>
        <aside className="sx-d-stack">
          <Parchment title="Dónde queda">
            <MapPin aria-hidden="true" />
            <p>{institucion.ubicacion.nombre}</p>
          </Parchment>
          <Parchment title="Costos y admisión">
            <p>
              Los costos, becas y fechas de admisión cambian cada año. Revísalos en su página oficial y
              anótalos en el presupuesto de tu tarjeta.
            </p>
            {institucion.pagina_web && (
              <a className="sx-d-action" href={institucion.pagina_web} target="_blank" rel="noreferrer">
                Ir a su página web
                <ExternalLink aria-hidden="true" />
              </a>
            )}
            <Link className="sx-d-action sx-d-action-ghost" to={appPaths.student.decisions}>
              Usarla en un presupuesto
            </Link>
          </Parchment>
        </aside>
      </div>
      <AvisoFavorito aviso={favorito.aviso} onDismiss={favorito.cerrarAviso} />
    </DiscoveryStage>
  )
}
