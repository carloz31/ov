import { Link, useParams } from 'react-router'
import { ExternalLink, MapPin } from 'lucide-react'
import { useOccupationExplorationContext } from '@/context/occupationExplorationContext'
import { DiscoveryStage } from '@/features/discovery/components/DiscoveryStage'
import { Parchment } from '@/components/student/Parchment'
import { FavoriteButton } from '@/components/student/FavoriteButton'
import { discoveryPaths } from '@/routes/discoveryPaths'
import { appPaths } from '@/routes/paths'
import { getInstitution, careersOfInstitution, getFamily } from '@/features/discovery/lib/catalogSelectors'
import { institutionTypeNames } from '@/features/discovery/lib/catalogDetails'
import { AtlasNavigation } from '@/features/discovery/components/AtlasNavigation'
import { MissingAtlasPage } from '@/features/discovery/components/MissingAtlasPage'
export function InstitutionDetailView() {
  const { institutionId = '' } = useParams(),
    context = useOccupationExplorationContext()
  const institution = getInstitution(institutionId)
  if (!institution)
    return (
      <DiscoveryStage ambient="atlas">
        <MissingAtlasPage />
      </DiscoveryStage>
    )
  const careers = careersOfInstitution(institution.id).sort(
    (a, b) =>
      Number(context.careerInterestIds.includes(b.id)) - Number(context.careerInterestIds.includes(a.id)),
  )
  return (
    <DiscoveryStage ambient="atlas">
      <AtlasNavigation section="institutions" />
      <Parchment className="sx-d-dark">
        <div className="sx-d-header">
          <div>
            <p className="sx-d-eyebrow">Institución ficticia · Demostración</p>
            <h1 className="sx-d-detail-title">{institution.name}</h1>
            <p>
              {institutionTypeNames[institution.type]} ·{' '}
              {institution.management === 'PUBLICA' ? 'Pública' : 'Privada'} ·{' '}
              {institution.location.department}
            </p>
          </div>
          <FavoriteButton
            selected={context.institutionInterestIds.includes(institution.id)}
            onToggle={() => context.toggleInstitutionInterest(institution.id)}
          />
        </div>
      </Parchment>
      <div className="sx-d-detail-grid">
        <main className="sx-d-stack">
          <Parchment title="Sobre la institución">
            <p>{institution.description}</p>
          </Parchment>
          <Parchment title="Carreras que ofrece">
            <p>Tus carreras favoritas aparecen primero.</p>
            <div className="sx-d-two">
              {careers.map((c) => (
                <Link className="sx-d-related" key={c.id} to={discoveryPaths.career(c.id)}>
                  <strong>{c.name}</strong>
                  <small>
                    {getFamily(c.familyId)?.name} · {c.durationYears} años
                  </small>
                  {context.careerInterestIds.includes(c.id) && <span>Favorita</span>}
                </Link>
              ))}
            </div>
            {!careers.length && <p>Las carreras de esta institución ficticia se incorporarán después.</p>}
          </Parchment>
        </main>
        <aside className="sx-d-stack">
          <Parchment title="Dónde queda">
            <MapPin aria-hidden="true" />
            <p>{institution.address}</p>
            <p>
              {institution.location.district} · {institution.location.province} ·{' '}
              {institution.location.department}
            </p>
          </Parchment>
          <Parchment title="Costos y admisión">
            <p>
              Los costos, becas y fechas de admisión cambian cada año. Revísalos en su página oficial y
              anótalos en el presupuesto de tu tarjeta.
            </p>
            {institution.website ? (
              <a className="sx-d-action" href={institution.website} target="_blank" rel="noreferrer">
                Ir a su página web
                <ExternalLink aria-hidden="true" />
              </a>
            ) : (
              <>
                <button type="button" className="sx-d-action" disabled>
                  Ir a su página web
                  <ExternalLink aria-hidden="true" />
                </button>
                <p>Esta institución es ficticia y no tiene una página oficial.</p>
              </>
            )}
            <Link className="sx-d-action sx-d-action-ghost" to={appPaths.student.decisions}>
              Usarla en un presupuesto
            </Link>
          </Parchment>
        </aside>
      </div>
    </DiscoveryStage>
  )
}
