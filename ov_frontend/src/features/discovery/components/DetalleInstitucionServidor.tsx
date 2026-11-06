import { Link } from 'react-router'
import { ExternalLink, Landmark, MapPin } from 'lucide-react'
import { FavoriteButton } from '@/components/student/FavoriteButton'
import { Parchment } from '@/components/student/Parchment'
import { appPaths } from '@/routes/paths'
import { nombresTipoInstitucion, textoGestion } from '@/lib/servidor/adaptadoresCatalogo'
import { useDetalleServidor } from '../hooks/useDetalleServidor'
import { useModoCatalogo } from '../hooks/useModoCatalogo'
import { AtlasNavigation } from './AtlasNavigation'
import { AvisoFavorito } from './AvisoFavorito'
import { CarrerasDeInstitucion } from './CarrerasDeInstitucion'
import { DiscoveryStage } from './DiscoveryStage'
import { EsperaDetalle } from './EsperaDetalle'
import { FuentesCatalogo } from './FuentesCatalogo'
import '../styles/catalogo.css'

// F06 · ajuste catalogo-datos-reales (F6b): el detalle de institución en api. Cabecera con tipo, gestión,
// ubicación, cuántas carreras, página web y favorito; la tabla de carreras con su ingreso; al lado, dónde queda
// y los costos; al pie, las fuentes.
// Ajuste catalogo-apoderado: en modo lectura, sin favorito, «Usarla en un presupuesto» ni la mención a la tarjeta en
// «Costos y admisión».
export function DetalleInstitucionServidor({
  codigo,
  variante,
}: {
  codigo: string
  variante?: 'estudiante' | 'portal'
}) {
  const { modoLectura } = useModoCatalogo()
  const { datos: institucion, favorito, ...estado } = useDetalleServidor('instituciones', codigo)
  if (!institucion) return <EsperaDetalle {...estado} onReintentar={estado.reintentar} variante={variante} />
  const gestion = textoGestion(institucion.gestion)
  const lugar = [institucion.distrito, institucion.ubicacion.nombre].filter(Boolean)
  return (
    <DiscoveryStage ambient="atlas" navegacion={false} variante={variante}>
      <AtlasNavigation section="institutions" migas={false} />
      <Parchment className="sx-d-dark sx-c-cabecera">
        <div className="sx-c-cabecera-fila">
          <div className="sx-c-cabecera-texto">
            <div className="sx-c-etiquetas">
              <span className="sx-c-etiqueta" data-tipo={institucion.tipo}>
                {nombresTipoInstitucion[institucion.tipo]}
              </span>
              {gestion && <span className="sx-c-etiqueta sx-c-etiqueta-oscura">{gestion}</span>}
            </div>
            <h1 className="sx-d-detail-title" tabIndex={-1}>
              {institucion.nombre}
            </h1>
            <p className="sx-c-datos">
              <span>
                <MapPin aria-hidden="true" size={16} /> {lugar.join(', ')}
              </span>
              <span>
                <Landmark aria-hidden="true" size={16} /> {institucion.carreras.length}{' '}
                {institucion.carreras.length === 1 ? 'carrera' : 'carreras'}
              </span>
            </p>
          </div>
          <div className="sx-c-cabecera-acciones">
            {institucion.pagina_web && (
              <a className="sx-d-action" href={institucion.pagina_web} target="_blank" rel="noreferrer">
                Página web <ExternalLink aria-hidden="true" size={16} />
              </a>
            )}
            {!modoLectura && (
              <FavoriteButton
                selected={institucion.es_favorita}
                pendiente={favorito.pendiente('instituciones', institucion.codigo)}
                onToggle={() =>
                  favorito.alternar('instituciones', institucion.codigo, !institucion.es_favorita)
                }
              />
            )}
          </div>
        </div>
      </Parchment>
      <div className="sx-d-detail-grid">
        <main className="sx-d-stack">
          <CarrerasDeInstitucion carreras={institucion.carreras} />
        </main>
        <aside className="sx-d-stack">
          <Parchment title="Dónde queda">
            <p className="sx-c-lugar">
              <MapPin aria-hidden="true" size={18} />
              <span>
                {institucion.direccion ?? institucion.ubicacion.nombre}
                <br />
                <small>
                  {[institucion.distrito, institucion.ubicacion.nombre].filter(Boolean).join(' · ')}
                </small>
              </span>
            </p>
          </Parchment>
          <Parchment title="Costos y admisión">
            <p>
              {modoLectura
                ? 'Los costos, becas y fechas de admisión cambian cada año. Revíselos en su página oficial.'
                : 'Los costos, becas y fechas de admisión cambian cada año. Revísalos en su página oficial y anótalos en el presupuesto de tu tarjeta.'}
            </p>
            {institucion.pagina_web && (
              <a
                className="sx-d-action sx-d-full"
                href={institucion.pagina_web}
                target="_blank"
                rel="noreferrer"
              >
                Ir a su página web
                <ExternalLink aria-hidden="true" size={16} />
              </a>
            )}
            {!modoLectura && (
              <Link className="sx-d-action sx-d-action-ghost sx-d-full" to={appPaths.student.decisions}>
                Usarla en un presupuesto
              </Link>
            )}
          </Parchment>
        </aside>
      </div>
      <FuentesCatalogo de="institucion" />
      <AvisoFavorito aviso={favorito.aviso} onDismiss={favorito.cerrarAviso} />
    </DiscoveryStage>
  )
}
