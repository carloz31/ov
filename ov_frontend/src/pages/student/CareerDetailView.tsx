import { useState } from 'react'
import { Link, useParams } from 'react-router'
import { GraduationCap } from 'lucide-react'
import { useOccupationExplorationContext } from '@/context/occupationExplorationContext'
import { DiscoveryStage } from '@/features/discovery/components/DiscoveryStage'
import { Parchment } from '@/components/student/Parchment'
import { FavoriteButton } from '@/components/student/FavoriteButton'
import { useDiscovery } from '@/store/discoveryStore'
import { CatalogRevisitNotice } from '@/features/discovery/components/CatalogRevisitNotice'
import { UnexpectedPlace } from '@/features/discovery/components/UnexpectedPlace'
import { useCatalogVisit } from '@/features/discovery/hooks/useCatalogVisit'
import { discoveryPaths } from '@/routes/discoveryPaths'
import { appPaths } from '@/routes/paths'
import { createPlanFromCareer, getOrderedPlans } from '@/features/discovery/lib/plans'
import {
  getCareer,
  getFamily,
  institutionsOfCareer,
  occupationsOfCareer,
  isAffine,
} from '@/features/discovery/lib/catalogSelectors'
import { institutionTypeNames, type IncomeRange } from '@/features/discovery/lib/catalogDetails'
import { AtlasNavigation } from '@/features/discovery/components/AtlasNavigation'
import { MissingAtlasPage } from '@/features/discovery/components/MissingAtlasPage'
const soles = (n: number) => `S/ ${n.toLocaleString('es-PE')}`
function IncomeCard({ title, range, scale }: { title: string; range?: IncomeRange; scale: number }) {
  return (
    <div className="sx-d-income-card">
      <h3>{title}</h3>
      {range ? (
        <>
          <p>Promedio mensual</p>
          <strong>{soles(range.average)}</strong>
          <div
            className="sx-d-income-range"
            role="img"
            aria-label={`Rango mensual de ${soles(range.min)} a ${soles(range.max)}, promedio ${soles(range.average)}`}
          >
            <span
              style={{
                left: `${(range.min / scale) * 100}%`,
                width: `${((range.max - range.min) / scale) * 100}%`,
              }}
            />
            <i style={{ left: `${(range.average / scale) * 100}%` }} />
          </div>
          <div className="sx-d-income-labels">
            <span>Mín. {soles(range.min)}</span>
            <span>Máx. {soles(range.max)}</span>
          </div>
        </>
      ) : (
        <p>Sin datos para este grupo</p>
      )}
    </div>
  )
}
export function CareerDetailView() {
  const { careerId = '' } = useParams(),
    context = useOccupationExplorationContext(),
    discovery = useDiscovery()
  const career = getCareer(careerId),
    [region, setRegion] = useState<'LIMA' | 'NACIONAL'>('LIMA')
  useCatalogVisit('career', career?.id)
  if (!career)
    return (
      <DiscoveryStage ambient="atlas">
        <MissingAtlasPage />
      </DiscoveryStage>
    )
  const family = getFamily(career.familyId)!,
    incomes = family.incomes[region]
  const scale = Math.max(incomes.young?.max ?? 0, incomes.adult?.max ?? 0, 1)
  const plans = getOrderedPlans(context.decisionSheets, discovery.planOrder),
    position = plans.findIndex((p) => p.sourceId === career.id)
  const activeCount = context.decisionSheets.filter((s) => s.status !== 'archived').length
  const families = new Set(
    [...discovery.viewedCareerIds, career.id].flatMap((id) => {
      const c = getCareer(id)
      return c ? [c.familyId] : []
    }),
  ).size
  return (
    <DiscoveryStage ambient="atlas">
      <AtlasNavigation section="careers" />
      <CatalogRevisitNotice />
      <Parchment className="sx-d-dark">
        <div className="sx-d-header">
          <div>
            <p className="sx-d-eyebrow">Carrera</p>
            <h1 className="sx-d-detail-title" tabIndex={-1}>
              {career.name}
            </h1>
            <p>
              {family.name} · {career.durationYears} años
            </p>
          </div>
          <FavoriteButton
            selected={context.careerInterestIds.includes(career.id)}
            onToggle={() => context.toggleCareerInterest(career.id)}
          />
        </div>
      </Parchment>
      <div className="sx-d-detail-grid">
        <main className="sx-d-stack">
          <Parchment title="De qué trata">
            <p>{career.description}</p>
            <span className="sx-d-tag">Duración referencial: {career.durationYears} años</span>
          </Parchment>
          <Parchment title="Cuánto se gana">
            <p>Ingresos de egresados de la familia {family.name}</p>
            <p className="sx-d-demo">Datos de demostración · No representan ingresos reales.</p>
            <div className="sx-d-tabs" role="group" aria-label="Ámbito de ingresos">
              {(['LIMA', 'NACIONAL'] as const).map((value) => (
                <button
                  type="button"
                  key={value}
                  aria-pressed={region === value}
                  onClick={() => setRegion(value)}
                >
                  {value === 'LIMA' ? 'Lima' : 'Nacional'}
                </button>
              ))}
            </div>
            <div className="sx-d-two sx-d-income-grid">
              <IncomeCard title="Jóvenes" range={incomes.young} scale={scale} />
              <IncomeCard title="Adultos" range={incomes.adult} scale={scale} />
            </div>
            <p>
              En {region === 'LIMA' ? 'Lima' : 'el país'}, esta familia ocupa el puesto {incomes.rank} de{' '}
              {incomes.rankTotal} en el ranking de ingresos.
            </p>
            <small>{family.source}</small>
            <p>Son ingresos de toda la familia de carreras, no solo de esta carrera.</p>
          </Parchment>
          <Parchment title="Ocupaciones a las que conduce">
            <div className="sx-d-two">
              {occupationsOfCareer(career.id).map((o) => (
                <Link className="sx-d-related" key={o.id} to={discoveryPaths.occupation(o.id)}>
                  <strong>{o.name}</strong>
                  {isAffine(o.id, discovery.revealedPages) && (
                    <small>{isAffine(o.id, discovery.revealedPages)} contigo · Demostración</small>
                  )}
                </Link>
              ))}
            </div>
          </Parchment>
        </main>
        <aside className="sx-d-stack">
          <Parchment title="Dónde estudiarla">
            {institutionsOfCareer(career.id).map((i) => (
              <Link className="sx-d-related" key={i.id} to={discoveryPaths.institution(i.id)}>
                <strong>{i.name}</strong>
                <small>
                  {institutionTypeNames[i.type]} · {i.location.department} · Ficticia
                </small>
              </Link>
            ))}
            <p>Los costos se consultan en la página de cada institución.</p>
          </Parchment>
          {position >= 0 ? (
            <Parchment title="En tus planes" className="sx-d-highlight">
              <p>Ya es tu Plan {'ABC'[position]}.</p>
              <Link className="sx-d-action" to={appPaths.student.decisions}>
                Ver mi tarjeta
              </Link>
            </Parchment>
          ) : (
            activeCount < 3 && (
              <Parchment title="¿Y si la conviertes en un plan?" className="sx-d-highlight">
                <button
                  type="button"
                  className="sx-d-action sx-d-action-gold"
                  onClick={() => createPlanFromCareer(career.name, career.id)}
                >
                  Hacer mi plan {'ABC'[plans.length]}
                </button>
              </Parchment>
            )
          )}
          <Parchment title="Explorando familias">
            <GraduationCap aria-hidden="true" />
            <div
              className="sx-d-family-segments"
              aria-label={`${Math.min(3, families)} de 3 familias exploradas`}
            >
              {[0, 1, 2].map((n) => (
                <span key={n} data-filled={n < families} />
              ))}
            </div>
            <p>Revisaste carreras de {families} familias distintas.</p>
            {families < 3 && <p>Mira una más para tu insignia de exploración.</p>}
            <small>Este recorrido registra tus visitas; la insignia mantiene sus requisitos actuales.</small>
          </Parchment>
        </aside>
      </div>
      <UnexpectedPlace kind="career" currentId={career.id} />
    </DiscoveryStage>
  )
}
