import { Link } from 'react-router'
import { Clock, FileText } from 'lucide-react'
import { FavoriteButton } from '@/components/student/FavoriteButton'
import { Parchment } from '@/components/student/Parchment'
import { discoveryPaths } from '@/routes/discoveryPaths'
import { appPaths } from '@/routes/paths'
import { nombresTipoCarrera } from '@/lib/servidor/adaptadoresCatalogo'
import { useDetalleServidor } from '../hooks/useDetalleServidor'
import { usePlanesCarrera } from '../hooks/usePlanesCarrera'
import { AtlasNavigation } from './AtlasNavigation'
import { AvisoFavorito } from './AvisoFavorito'
import { BloquePlanCarrera } from './BloquePlanCarrera'
import { CarrerasParecidas } from './CarrerasParecidas'
import { CatalogRevisitNotice } from './CatalogRevisitNotice'
import { DiscoveryStage } from './DiscoveryStage'
import { DondeEstudiarla } from './DondeEstudiarla'
import { EsperaDetalle } from './EsperaDetalle'
import { FuentesCatalogo } from './FuentesCatalogo'
import { IngresoCarrera } from './IngresoCarrera'
import { SellosRiasec } from './SellosRiasec'
import { UnexpectedPlace } from './UnexpectedPlace'
import '../styles/catalogo.css'

// F06 · ajuste catalogo-datos-reales (F6b): el detalle de carrera en api. Cabecera con tipo, área y familia;
// qué trata, dónde trabajar, ingresos y profesiones; al lado, el plan (la acción central), dónde estudiarla,
// las parecidas y el lugar inesperado; al pie, las fuentes.
export function DetalleCarreraServidor({ codigo }: { codigo: string }) {
  const { datos: carrera, favorito, ...estado } = useDetalleServidor('carreras', codigo)
  const planes = usePlanesCarrera(carrera?.codigo ?? codigo, carrera?.nombre ?? '')
  if (!carrera) return <EsperaDetalle {...estado} onReintentar={estado.reintentar} />
  const areaUrl = `${appPaths.student.catalog.careers}?area=${carrera.familia.area_codigo}`
  return (
    <DiscoveryStage ambient="atlas" navegacion={false}>
      <AtlasNavigation section="careers" />
      <CatalogRevisitNotice />
      <Parchment className="sx-d-dark sx-c-cabecera">
        <div className="sx-c-cabecera-fila">
          <div className="sx-c-cabecera-texto">
            <div className="sx-c-etiquetas">
              <span className="sx-c-etiqueta" data-tipo={carrera.tipo}>
                Carrera {nombresTipoCarrera[carrera.tipo].toLowerCase()}
              </span>
              <Link className="sx-c-etiqueta sx-c-etiqueta-oscura" to={areaUrl}>
                {carrera.familia.area_nombre}
              </Link>
              <Link
                className="sx-c-etiqueta sx-c-etiqueta-oscura"
                to={`${appPaths.student.catalog.careers}?familia=${carrera.familia.codigo}`}
              >
                {carrera.familia.nombre}
              </Link>
            </div>
            <h1 className="sx-d-detail-title" tabIndex={-1}>
              {carrera.nombre}
            </h1>
            <p className="sx-c-datos">
              {carrera.duracion && (
                <span>
                  <Clock aria-hidden="true" size={16} /> {carrera.duracion}
                </span>
              )}
              {carrera.nombre_cine && (
                <span>
                  <FileText aria-hidden="true" size={16} /> Se registra como <strong>{carrera.nombre_cine}</strong>
                </span>
              )}
            </p>
            <SellosRiasec letras={carrera.riasec} conNombres />
          </div>
          <div className="sx-c-cabecera-acciones">
            {planes.letra && <span className="sx-c-es-plan">Es tu Plan {planes.letra}</span>}
            <FavoriteButton
              selected={carrera.es_favorita}
              pendiente={favorito.pendiente('carreras', carrera.codigo)}
              onToggle={() => favorito.alternar('carreras', carrera.codigo, !carrera.es_favorita)}
            />
          </div>
        </div>
      </Parchment>
      <div className="sx-d-detail-grid">
        <main className="sx-d-stack">
          {carrera.descripcion && (
            <Parchment title="De qué trata">
              <p>{carrera.descripcion}</p>
            </Parchment>
          )}
          {carrera.ambito_laboral.length > 0 && (
            <Parchment title="Dónde podrías trabajar">
              <ul className="sx-c-vinetas sx-c-dos-columnas">
                {carrera.ambito_laboral.map((linea) => (
                  <li key={linea}>{linea}</li>
                ))}
              </ul>
            </Parchment>
          )}
          {carrera.ingreso && (
            <IngresoCarrera
              ingreso={carrera.ingreso}
              instituciones={carrera.instituciones}
              familia={carrera.familia.nombre}
              tipo={carrera.tipo}
            />
          )}
          {carrera.ocupaciones.length > 0 && (
            <Parchment title="Profesiones a las que conduce">
              <p className="sx-c-conteo">
                {carrera.ocupaciones.length} {carrera.ocupaciones.length === 1 ? 'profesión' : 'profesiones'}
              </p>
              <div className="sx-d-two">
                {carrera.ocupaciones.map((o) => (
                  <Link className="sx-d-related sx-c-fila-enlace" key={o.codigo} to={discoveryPaths.occupation(o.codigo)}>
                    <strong>{o.titulo}</strong>
                    <SellosRiasec letras={o.riasec} />
                  </Link>
                ))}
              </div>
            </Parchment>
          )}
        </main>
        <aside className="sx-d-stack">
          <BloquePlanCarrera planes={planes} />
          <DondeEstudiarla instituciones={carrera.instituciones} />
          <CarrerasParecidas parecidas={carrera.parecidas} familia={carrera.familia} />
          <UnexpectedPlace kind="career" currentId={carrera.codigo} />
        </aside>
      </div>
      <FuentesCatalogo de="carrera" />
      <AvisoFavorito aviso={favorito.aviso} onDismiss={favorito.cerrarAviso} />
    </DiscoveryStage>
  )
}
