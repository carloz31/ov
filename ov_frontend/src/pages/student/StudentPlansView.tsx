import { useReturnFocus } from '@/hooks/useReturnFocus'
import { useState } from 'react'
import { Link } from 'react-router'
import { Eye, Heart, Search, Star } from 'lucide-react'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/Dialog'
import { useOccupationExplorationContext } from '@/context/occupationExplorationContext'
import {
  careerCatalog,
  institutionCatalog,
} from '@/data/catalog/careersAndInstitutions'
import { occupationCatalog } from '@/data/catalog/occupations'
import { getInstitution, isAffine } from '@/features/discovery/lib/catalogSelectors'
import { institutionTypeNames } from '@/features/discovery/lib/catalogDetails'
import { appPaths } from '@/routes/paths'
import { discoveryPaths } from '@/routes/discoveryPaths'
import { useDiscovery, updateDiscovery } from '@/store/discoveryStore'
import { DiscoveryStage } from '@/features/discovery/components/DiscoveryStage'
import { Parchment } from '@/components/student/Parchment'
import { PendingNotice } from '@/components/student/PendingNotice'
import { PlanCard } from '@/features/discovery/components/PlanCard'
import { archivePlan, createPlanFromCareer, getOrderedPlans, getPlanCompleteness } from '@/features/discovery/lib/plans'

export function StudentPlansView() {
  const focus = useReturnFocus()
  const context = useOccupationExplorationContext(),
    discovery = useDiscovery()
  const [archiveId, setArchiveId] = useState<string>(),
    [notice, setNotice] = useState(false)
  const plans = getOrderedPlans(context.decisionSheets, discovery.planOrder)
  const active = context.decisionSheets.filter((s) => s.status !== 'archived')
  const first = [...active].sort((a, b) => a.createdAt.localeCompare(b.createdAt))[0]?.id
  const available = active.length < 3
  function move(index: number, direction: -1 | 1) {
    const ids = plans.map((p) => p.id),
      next = index + direction
    if (next < 0 || next >= ids.length) return
    ;[ids[index], ids[next]] = [ids[next], ids[index]]
    updateDiscovery((s) => ({
      ...s,
      planOrder: [
        ...ids,
        ...s.planOrder.filter((id) => !ids.includes(id) && active.some((p) => p.id === id)),
      ],
    }))
  }
  const occupations = context.profiles
    .filter((p) => p.interested)
    .flatMap((p) => occupationCatalog.filter((o) => o.id === p.occupationId))
  return (
    <DiscoveryStage ambient="plans">
      <header className="sx-d-header">
        <div>
          <h1>Mis planes</h1>
          <p>Las rutas que estás considerando para después del colegio</p>
        </div>
        <strong>
          <Star aria-hidden="true" />
          {plans.filter((p) => getPlanCompleteness(p) === 4).length} de 3 planes listos
        </strong>
      </header>
      <div className="sx-d-columns">
        {[0, 1, 2].map((i) =>
          plans[i] ? (
            <PlanCard
              key={plans[i].id}
              sheet={plans[i]}
              index={i}
              count={plans.length}
              first={plans[i].id === first}
              onArchive={() => setArchiveId(plans[i].id)}
              onMove={(direction) => move(i, direction)}
              onPending={() => setNotice(true)}
            />
          ) : (
            <section className="sx-d-empty-plan" key={i}>
              <span className="sx-d-plan-letter" data-position={i}>
                {'ABC'[i]}
              </span>
              <h2>Espacio para tu plan {'ABC'[i]}</h2>
              <p>
                Tener otra ruta a la mano también es parte de decidir. Puedes partir de una carrera que
                marcaste como favorita.
              </p>
              <a className="sx-d-action sx-d-action-gold" href="#sx-favorites">
                Desde mis favoritos
              </a>
              <Link className="sx-d-action sx-d-action-ghost" to={appPaths.student.catalog.careers}>
                Buscar en el catálogo
              </Link>
            </section>
          ),
        )}
      </div>
      <div id="sx-favorites">
        <Parchment title="Lo que guardaste en el camino">
          <div className="sx-d-header">
            <p>
              <Heart aria-hidden="true" />
              Tus favoritos del catálogo. Una carrera favorita puede convertirse en un plan.
            </p>
            <Link className="sx-d-action sx-d-action-ghost" to={appPaths.student.catalog.careers}>
              <Search />
              Explorar el catálogo
            </Link>
          </div>
          <div className="sx-d-columns">
            <section>
              <h3>Carreras · {context.careerInterestIds.length}</h3>
              {context.careerInterestIds.map((id) => {
                const career = careerCatalog.find((c) => c.id === id)
                const position = plans.findIndex((p) => p.sourceId === id)
                return (
                  career && (
                    <div className="sx-d-favorite-row" key={id}>
                      <Link to={discoveryPaths.career(id)}>{career.name}</Link>
                      {position >= 0 ? (
                        <span>Plan {'ABC'[position]}</span>
                      ) : (
                        available && (
                          <button
                            type="button"
                            className="sx-d-action"
                            onClick={() => createPlanFromCareer(career.name, career.id)}
                          >
                            Hacer mi plan {'ABC'[plans.length]}
                          </button>
                        )
                      )}
                    </div>
                  )
                )
              })}
              {!context.careerInterestIds.length && (
                <p>
                  Aún no guardas carreras.{' '}
                  <Link to={appPaths.student.catalog.careers}>Explorar carreras</Link>
                </p>
              )}
            </section>
            <section>
              <h3>Ocupaciones · {occupations.length}</h3>
              {occupations.map((o) => (
                <div key={o.id} className="sx-d-favorite-row">
                  <Link to={discoveryPaths.occupation(o.id)}>{o.name}</Link>
                  {discovery.research?.occupationId === o.id ? (
                    <small>Investigación en curso</small>
                  ) : (
                    isAffine(o.id, discovery.revealedPages) && <small>Afín a tu perfil · Demostración</small>
                  )}
                </div>
              ))}
              {!occupations.length && (
                <p>
                  Aún no guardas ocupaciones.{' '}
                  <Link to={appPaths.student.catalog.professions}>Explorar ocupaciones</Link>
                </p>
              )}
            </section>
            <section>
              <h3>Instituciones · {context.institutionInterestIds.length}</h3>
              {context.institutionInterestIds.map((id) => {
                const legacy = institutionCatalog.find((i) => i.id === id),
                  detail = getInstitution(id)
                return (
                  <div key={id} className="sx-d-favorite-row">
                    <Link
                      to={legacy ? appPaths.student.catalog.institutions : discoveryPaths.institution(id)}
                    >
                      {legacy?.name ?? detail?.name ?? id}
                    </Link>
                    {legacy ? (
                      <small>Categoría heredada · {legacy.type}</small>
                    ) : (
                      detail && (
                        <small>
                          {institutionTypeNames[detail.type]} · {detail.location.department}
                        </small>
                      )
                    )}
                  </div>
                )
              })}
              {!context.institutionInterestIds.length && (
                <p>
                  Aún no guardas instituciones.{' '}
                  <Link to={appPaths.student.catalog.institutions}>Explorar instituciones</Link>
                </p>
              )}
            </section>
          </div>
        </Parchment>
      </div>
      <p className="sx-d-privacy">
        <Eye aria-hidden="true" />
        Tus planes los ven tú y tu orientadora. Tus compañeros no los ven.
      </p>
      <Dialog
        open={!!archiveId}
        onOpenChange={(open) => {
          if (!open) setArchiveId(undefined)
        }}
      >
        <DialogContent {...focus} className="sx-root sx-d-dialog">
          <DialogHeader>
            <DialogTitle>¿Archivar {plans.find((p) => p.id === archiveId)?.name}?</DialogTitle>
            <DialogDescription>Podrás volver a crearla desde tus favoritos.</DialogDescription>
          </DialogHeader>
          <div className="sx-d-actions">
            <button
              type="button"
              className="sx-d-action sx-d-action-ghost"
              onClick={() => setArchiveId(undefined)}
            >
              Cancelar
            </button>
            <button
              type="button"
              className="sx-d-action"
              onClick={() => {
                context.setDecisionSheets((current) => archivePlan(current, archiveId!))
                updateDiscovery((s) => ({ ...s, planOrder: s.planOrder.filter((id) => id !== archiveId) }))
                setArchiveId(undefined)
              }}
            >
              Archivar plan
            </button>
          </div>
        </DialogContent>
      </Dialog>
      {notice && <PendingNotice onClose={() => setNotice(false)} />}
    </DiscoveryStage>
  )
}
