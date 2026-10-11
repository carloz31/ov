import { Badge } from '@/components/ui/Badge'

import { profileCatalog } from '@/data/demo/studentProfiles'

import { affinities, displayDate, favoriteRelations } from '@/features/student-tracking/lib/selectors'

import { EmptyMessage } from '@/features/student-tracking/components/EmptyMessage'
import { Panel } from '@/features/student-tracking/components/Panel'
import type { StudentProfile } from '@/types/studentProfile'
import { PlanCard } from '@/features/student-tracking/components/PlanCard'

export function OptionsSection({ student }: { student: StudentProfile }) {
  const affinity = affinities(student, profileCatalog)
  const relations = favoriteRelations(student, profileCatalog)
  const initial = student.initialInterest
  const initialPlan = initial && student.plans.find((p) => p.careerId === initial.careerId)
  return (
    <div className="space-y-4">
      <Panel title="Sus planes">
        <div className="grid items-start gap-4 lg:grid-cols-3">
          {(['A', 'B', 'C'] as const).map((slot) => {
            const plan = student.plans.find((p) => p.slot === slot)
            return plan ? (
              <PlanCard key={slot} plan={plan} student={student} />
            ) : (
              <p key={slot} className="rounded-lg border border-dashed p-4 text-muted-foreground">
                Plan {slot} sin registrar
              </p>
            )
          })}
        </div>
      </Panel>
      <Panel title="Interés inicial">
        {initial ? (
          <div className="space-y-2">
            <p>
              Su primera opción fue {profileCatalog.careers.find((c) => c.id === initial.careerId)?.name} (
              {displayDate(initial.date)}).
            </p>
            <p className="text-muted-foreground">
              {initialPlan ? `Hoy es su Plan ${initialPlan.slot}` : 'Ya no está entre sus planes'}
            </p>
          </div>
        ) : (
          <EmptyMessage>Todavía no registra una primera opción de carrera.</EmptyMessage>
        )}
      </Panel>
      <Panel title="Favoritos">
        <p className="mb-4 text-muted-foreground">
          {affinity.available
            ? `${affinity.matched} de ${affinity.total} favoritos coinciden con su test de intereses`
            : 'Se mostrará cuando complete el test de intereses.'}
        </p>
        <div className="grid gap-5 lg:grid-cols-3">
          <section>
            <h3 className="mb-3 font-semibold">Carreras</h3>
            {student.favorites.careers.length ? (
              <ul className="space-y-3">
                {student.favorites.careers.map((id) => (
                  <li key={id} className="space-y-2 rounded-lg border p-3">
                    <p>{profileCatalog.careers.find((c) => c.id === id)?.name}</p>
                    <div className="flex flex-wrap gap-2">
                      {affinity.careers.includes(id) && <Badge variant="secondary">Afín a su test</Badge>}
                      {relations.careers.includes(id) && (
                        <Badge variant="outline" className="whitespace-normal">
                          Relacionada con una ocupación favorita
                        </Badge>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <EmptyMessage>Todavía no marca carreras como favoritas.</EmptyMessage>
            )}
          </section>
          <section>
            <h3 className="mb-3 font-semibold">Ocupaciones</h3>
            {student.favorites.occupations.length ? (
              <ul className="space-y-3">
                {student.favorites.occupations.map((id) => (
                  <li key={id} className="space-y-2 rounded-lg border p-3">
                    <p>{profileCatalog.occupations.find((o) => o.id === id)?.name}</p>
                    <div className="flex flex-wrap gap-2">
                      {affinity.occupations.includes(id) && <Badge variant="secondary">Afín a su test</Badge>}
                      {relations.occupations.includes(id) && (
                        <Badge variant="outline" className="whitespace-normal">
                          Relacionada con una carrera favorita
                        </Badge>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <EmptyMessage>Todavía no marca ocupaciones como favoritas.</EmptyMessage>
            )}
          </section>
          <section>
            <h3 className="mb-3 font-semibold">Instituciones</h3>
            {student.favorites.institutions.length ? (
              <ul className="space-y-3">
                {student.favorites.institutions.map((id) => (
                  <li key={id} className="space-y-2 rounded-lg border p-3">
                    <p>{profileCatalog.institutions.find((i) => i.id === id)?.name}</p>
                    {relations.institutions.includes(id) ? (
                      <Badge variant="outline" className="whitespace-normal">
                        Ofrece una de sus carreras favoritas o de sus planes
                      </Badge>
                    ) : (
                      <p className="text-sm text-muted-foreground">
                        No ofrece ninguna de sus carreras favoritas
                      </p>
                    )}
                  </li>
                ))}
              </ul>
            ) : (
              <EmptyMessage>Todavía no marca instituciones como favoritas.</EmptyMessage>
            )}
          </section>
        </div>
      </Panel>
    </div>
  )
}
