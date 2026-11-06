import { useIconosObtenidos } from '@/features/discovery/hooks/useIconosObtenidos'
import { useCatalogAffinity } from '@/features/discovery/hooks/useCatalogAffinity'
import { Link, useParams } from 'react-router'
import { useOccupationExplorationContext } from '@/context/occupationExplorationContext'
import { DiscoveryStage } from '@/features/discovery/components/DiscoveryStage'
import { Parchment } from '@/components/student/Parchment'
import { FavoriteButton } from '@/components/student/FavoriteButton'
import { Seal } from '@/components/student/Seal'
import { TrailBar } from '@/components/student/TrailBar'
import { useDiscovery } from '@/store/discoveryStore'
import { discoveryPaths } from '@/routes/discoveryPaths'
import { getOccupation, careersOfOccupation, getFamily } from '@/features/discovery/lib/catalogSelectors'
import { dimensionNames, type RiasecDimension } from '@/features/discovery/lib/catalogDetails'
import { AtlasNavigation } from '@/features/discovery/components/AtlasNavigation'
import { MissingAtlasPage } from '@/features/discovery/components/MissingAtlasPage'
import { AfinidadOcupacion } from '@/features/discovery/components/AfinidadOcupacion'
import { EntrevistasOcupacion } from '@/features/discovery/components/EntrevistasOcupacion'
import { DetalleOcupacionServidor } from '@/features/discovery/components/DetalleOcupacionServidor'
import { useCatalogoDelServidor } from '@/features/discovery/hooks/useCatalogoServidor'
import { CatalogRevisitNotice } from '@/features/discovery/components/CatalogRevisitNotice'
import { UnexpectedPlace } from '@/features/discovery/components/UnexpectedPlace'
import { useCatalogVisit } from '@/features/discovery/hooks/useCatalogVisit'
export function OccupationDetailView() {
  const { occupationId = '' } = useParams(),
    context = useOccupationExplorationContext(),
    discovery = useDiscovery()
  const { afinidadPara, coincidenciaPara } = useCatalogAffinity(discovery)
  const occupation = getOccupation(occupationId)
  // F06: en api, el detalle sale del servidor, que registra su propia vista.
  const { catalogoDelServidor } = useCatalogoDelServidor()
  useCatalogVisit('occupation', catalogoDelServidor ? undefined : occupation?.id)
  const obtenida = useIconosObtenidos()
  if (catalogoDelServidor) return <DetalleOcupacionServidor codigo={occupationId} />
  if (!occupation)
    return (
      <DiscoveryStage ambient="atlas">
        <MissingAtlasPage />
      </DiscoveryStage>
    )
  const profile = context.profiles.find((p) => p.occupationId === occupation.id),
    affinity = afinidadPara(occupation.id)
  const coincidencia = coincidenciaPara(occupation.id)
  const careers = careersOfOccupation(occupation.id)
  return (
    <DiscoveryStage ambient="atlas">
      <AtlasNavigation section="professions" />
      <CatalogRevisitNotice />
      <Parchment className="sx-d-dark">
        <div className="sx-d-header">
          <div>
            <p className="sx-d-eyebrow">
              Ocupación · {occupation.onetCode ? `O*NET ${occupation.onetCode}` : 'O*NET por incorporar'}
            </p>
            <h1 className="sx-d-detail-title" tabIndex={-1}>
              {occupation.name}
            </h1>
            <p>{occupation.highPoints.map((d) => dimensionNames[d]).join(' · ')}</p>
            {obtenida(occupation.id) && (
              <span className="sx-d-tag">Ícono obtenido en la Central de Casos</span>
            )}
          </div>
          <FavoriteButton
            selected={!!profile?.interested}
            onToggle={() => context.toggleOccupationInterest(occupation.id)}
          />
        </div>
      </Parchment>
      <div className="sx-d-detail-grid">
        <main className="sx-d-stack">
          <Parchment title="Qué hacen">
            <p>{occupation.whatTheyDo}</p>
          </Parchment>
          <Parchment title="Conocimientos que usan">
            {occupation.contentStatus !== 'pending' && <p>Ordenados por importancia.</p>}
            <div className="sx-d-tags">
              {occupation.knowledge.map((s) => (
                <span className="sx-d-tag" key={s}>
                  {s}
                </span>
              ))}
            </div>
            <small>
              {occupation.contentStatus === 'pending'
                ? 'Ficha en preparación desde O*NET.'
                : 'Selección de conocimientos de demostración.'}
            </small>
          </Parchment>
          <Parchment title="Habilidades que necesitan">
            <div className="sx-d-tags">
              {occupation.skills.map((s) => (
                <span className="sx-d-tag" key={s}>
                  {s}
                </span>
              ))}
            </div>
          </Parchment>
          <Parchment title="A qué tipo de persona le suele atraer">
            {occupation.contentStatus === 'pending' ? (
              <p>[Perfil de intereses: por completar desde O*NET]</p>
            ) : (
              <>
                <p className="sx-d-demo">Perfil RIASEC de demostración · No es una ficha O*NET validada.</p>
                <div className="sx-d-seal-row">
                  {occupation.highPoints.map((d) => (
                    <Seal key={d} state="revealed">
                      {d}
                    </Seal>
                  ))}
                </div>
                <p>
                  Su código de interés es {occupation.highPoints.map((d) => dimensionNames[d]).join(' · ')}:
                  los tres intereses que más pesan en esta ocupación.
                </p>
                {(Object.keys(dimensionNames) as RiasecDimension[]).map((d) => (
                  <TrailBar
                    key={d}
                    label={dimensionNames[d]}
                    value={occupation.interestScores[d]}
                    muted={!occupation.highPoints.includes(d)}
                  />
                ))}
              </>
            )}
          </Parchment>
        </main>
        <aside className="sx-d-stack">
          <AfinidadOcupacion afinidad={affinity} coincidencia={coincidencia} />
          {careers.length > 0 && (
            <Parchment title="Carreras que conducen a ella">
              <p>Las carreras del Perú que forman para esta ocupación.</p>
              <small>Relaciones educativas de demostración.</small>
              {careers.map((c) => (
                <Link key={c.id} className="sx-d-related" to={discoveryPaths.career(c.id)}>
                  <strong>{c.name}</strong>
                  <small>
                    {getFamily(c.familyId)?.name} · {c.durationYears} años
                  </small>
                </Link>
              ))}
            </Parchment>
          )}
          <EntrevistasOcupacion codigo={occupation.id} />
        </aside>
      </div>
      <UnexpectedPlace kind="occupation" currentId={occupation.id} />
    </DiscoveryStage>
  )
}
