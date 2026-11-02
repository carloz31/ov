import { Link } from 'react-router'
import { Clock, FileText } from 'lucide-react'
import { FavoriteButton } from '@/components/student/FavoriteButton'
import { Parchment } from '@/components/student/Parchment'
import { nombresTipoCarrera } from '@/lib/servidor/adaptadoresCatalogo'
import { useDetalleServidor } from '../hooks/useDetalleServidor'
import { useModoCatalogo } from '../hooks/useModoCatalogo'
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
import { OcupacionesDeLaFamilia } from './OcupacionesDeLaFamilia'
import { SellosRiasec } from './SellosRiasec'
import { UnexpectedPlace } from './UnexpectedPlace'
import '../styles/catalogo.css'

// F06 · ajuste catalogo-datos-reales (F6b): el detalle de carrera en api. Cabecera con tipo, área y familia,
// «Guardar» y «Hacer mi plan» (ajuste resultados-intereses); qué trata, dónde trabajar e ingresos; al lado, dónde
// estudiarla, las parecidas y el lugar inesperado; debajo, las ocupaciones a las que lleva su familia; al pie, las
// fuentes.
// Ajuste catalogo-apoderado: en modo lectura, sin favorito, plan ni lugar inesperado.
export function DetalleCarreraServidor({
  codigo,
  variante,
}: {
  codigo: string
  variante?: 'estudiante' | 'portal'
}) {
  const { modoLectura, rutas } = useModoCatalogo()
  const { datos: carrera, favorito, ...estado } = useDetalleServidor('carreras', codigo)
  const planes = usePlanesCarrera(carrera?.codigo ?? codigo, !!carrera?.es_favorita, !modoLectura)
  if (!carrera) return <EsperaDetalle {...estado} onReintentar={estado.reintentar} variante={variante} />
  const botonFavorito = !modoLectura && (
    <FavoriteButton
      selected={carrera.es_favorita}
      pendiente={favorito.pendiente('carreras', carrera.codigo)}
      onToggle={() => favorito.alternar('carreras', carrera.codigo, !carrera.es_favorita)}
    />
  )
  const areaUrl = `${rutas.catalog.careers}?area=${carrera.familia.area_codigo}`
  const familiaUrl = `${rutas.catalog.careers}?${new URLSearchParams({
    area: carrera.familia.area_codigo,
    familia: carrera.familia.codigo,
  })}`
  return (
    <DiscoveryStage ambient="atlas" navegacion={false} variante={variante}>
      <AtlasNavigation section="careers" migas={false} />
      <CatalogRevisitNotice />
      <Parchment className="sx-d-dark sx-c-cabecera">
        <div className="sx-c-cabecera-fila">
          <div className="sx-c-cabecera-texto">
            <div className="sx-c-etiquetas">
              <span className="sx-c-etiqueta" data-tipo={carrera.tipo}>
                Carrera {nombresTipoCarrera[carrera.tipo].toLowerCase()}
              </span>
              <Link className="sx-c-etiqueta sx-c-etiqueta-oscura" to={areaUrl}>
                Área: {carrera.familia.area_nombre}
              </Link>
              <Link className="sx-c-etiqueta sx-c-etiqueta-oscura sx-c-etiqueta-enlace" to={familiaUrl}>
                Familia: {carrera.familia.nombre}
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
                  <FileText aria-hidden="true" size={16} /> Se registra como{' '}
                  <strong>{carrera.nombre_cine}</strong>
                </span>
              )}
            </p>
            <SellosRiasec letras={carrera.riasec} conNombres />
          </div>
          <div className="sx-c-cabecera-acciones">
            {botonFavorito}
            {!modoLectura && <BloquePlanCarrera planes={planes} />}
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
        </main>
        <aside className="sx-d-stack">
          <DondeEstudiarla instituciones={carrera.instituciones} />
          <CarrerasParecidas parecidas={carrera.parecidas} familia={carrera.familia} />
          {!modoLectura && <UnexpectedPlace kind="career" currentId={carrera.codigo} />}
        </aside>
      </div>
      <OcupacionesDeLaFamilia
        ocupaciones={carrera.ocupaciones_de_la_familia}
        familia={carrera.familia}
        rutas={rutas}
      />
      <FuentesCatalogo de="carrera" />
      <AvisoFavorito aviso={favorito.aviso} onDismiss={favorito.cerrarAviso} />
    </DiscoveryStage>
  )
}
