import { Link } from 'react-router'
import { FavoriteButton } from '@/components/student/FavoriteButton'
import { Parchment } from '@/components/student/Parchment'
import { Seal } from '@/components/student/Seal'
import { useDiscovery } from '@/store/discoveryStore'
import { discoveryPaths } from '@/routes/discoveryPaths'
import { useCatalogAffinity } from '../hooks/useCatalogAffinity'
import { useDetalleServidor } from '../hooks/useDetalleServidor'
import { useIconosObtenidos } from '../hooks/useIconosObtenidos'
import { dimensionNames, type RiasecDimension } from '../lib/catalogDetails'
import { AfinidadOcupacion } from './AfinidadOcupacion'
import { AtlasNavigation } from './AtlasNavigation'
import { AvisoFavorito } from './AvisoFavorito'
import { CatalogRevisitNotice } from './CatalogRevisitNotice'
import { DiscoveryStage } from './DiscoveryStage'
import { DondeTrabajan } from './DondeTrabajan'
import { EntrevistasOcupacion } from './EntrevistasOcupacion'
import { EsperaDetalle } from './EsperaDetalle'
import { UnexpectedPlace } from './UnexpectedPlace'

function Etiquetas({ titulo, items }: { titulo: string; items: string[] }) {
  if (!items.length) return null
  return (
    <Parchment title={titulo}>
      <div className="sx-d-tags">
        {items.map((s) => (
          <span className="sx-d-tag" key={s}>
            {s}
          </span>
        ))}
      </div>
    </Parchment>
  )
}

// F06: el detalle de ocupación en api. Sin puntajes por dimensión (el servidor no los entrega).
export function DetalleOcupacionServidor({ codigo }: { codigo: string }) {
  const { datos: ocupacion, favorito, ...estado } = useDetalleServidor('ocupaciones', codigo)
  const { afinidadPara, coincidenciaPara } = useCatalogAffinity(useDiscovery())
  const obtenida = useIconosObtenidos()
  if (!ocupacion) return <EsperaDetalle {...estado} onReintentar={estado.reintentar} />
  const nombres = ocupacion.riasec.map((d) => dimensionNames[d as RiasecDimension])
  return (
    <DiscoveryStage ambient="atlas">
      <AtlasNavigation section="professions" />
      <CatalogRevisitNotice />
      <Parchment className="sx-d-dark">
        <div className="sx-d-header">
          <div>
            <p className="sx-d-eyebrow">Ocupación · O*NET {ocupacion.codigo_onet}</p>
            <h1 className="sx-d-detail-title" tabIndex={-1}>
              {ocupacion.titulo}
            </h1>
            <p>{nombres.join(' · ')}</p>
            {obtenida(ocupacion.codigo) && <span className="sx-d-tag">Ícono obtenido en la Central de Casos</span>}
          </div>
          <FavoriteButton
            selected={ocupacion.es_favorita}
            pendiente={favorito.pendiente('ocupaciones', ocupacion.codigo)}
            onToggle={() => favorito.alternar('ocupaciones', ocupacion.codigo, !ocupacion.es_favorita)}
          />
        </div>
      </Parchment>
      <div className="sx-d-detail-grid">
        <main className="sx-d-stack">
          {ocupacion.descripcion && (
            <Parchment title="Qué hacen">
              <p>{ocupacion.descripcion}</p>
            </Parchment>
          )}
          <DondeTrabajan lugares={ocupacion.lugares_trabajo} />
          <Etiquetas titulo="Conocimientos que usan" items={ocupacion.conocimientos} />
          <Etiquetas titulo="Habilidades que necesitan" items={ocupacion.habilidades} />
          {ocupacion.riasec.length > 0 && (
            <Parchment title="A qué tipo de persona le suele atraer">
              <div className="sx-d-seal-row">
                {ocupacion.riasec.map((d) => (
                  <Seal key={d} state="revealed">
                    {d}
                  </Seal>
                ))}
              </div>
              <p>Su código de interés es {nombres.join(' · ')}: los intereses que más pesan en esta ocupación.</p>
            </Parchment>
          )}
        </main>
        <aside className="sx-d-stack">
          <AfinidadOcupacion
            afinidad={afinidadPara(ocupacion.codigo)}
            coincidencia={coincidenciaPara(ocupacion.codigo)}
          />
          {ocupacion.carreras.length > 0 && (
            <Parchment title="Carreras que conducen a ella">
              <p>Las carreras del Perú que forman para esta ocupación.</p>
              {ocupacion.carreras.map((c) => (
                <Link key={c.codigo} className="sx-d-related" to={discoveryPaths.career(c.codigo)}>
                  <strong>{c.nombre}</strong>
                  <small>{c.familia.nombre}</small>
                </Link>
              ))}
            </Parchment>
          )}
          <EntrevistasOcupacion codigo={ocupacion.codigo} />
        </aside>
      </div>
      <UnexpectedPlace kind="occupation" currentId={ocupacion.codigo} />
      <AvisoFavorito aviso={favorito.aviso} onDismiss={favorito.cerrarAviso} />
    </DiscoveryStage>
  )
}
