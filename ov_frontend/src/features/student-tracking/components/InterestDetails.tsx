import { Badge } from '@/components/ui/Badge'
import { Card } from '@/components/ui/Card'

import { profileCatalog } from '@/data/demo/studentProfiles'

import { isFlatProfile } from '@/features/student-tracking/lib/selectors'

import { EmptyMessage } from '@/features/student-tracking/components/EmptyMessage'
import { Panel } from '@/features/student-tracking/components/Panel'

import type { QuestionnaireResult, StudentProfile } from '@/types/studentProfile'

export function InterestDetails({
  student,
  result,
  audience = 'counselor',
}: {
  student: StudentProfile
  result: Extract<QuestionnaireResult, { kind: 'interests' }>
  audience?: 'counselor' | 'parent'
}) {
  if (isFlatProfile(result.values)) return null
  const matches = result.matches.slice(0, 10)
  const occupationIds = matches.map((item) => item.occupationId)
  const careers = profileCatalog.careers.filter((career) =>
    profileCatalog.occupations.some(
      (occupation) => occupationIds.includes(occupation.id) && occupation.careerIds.includes(career.id),
    ),
  )
  const family = audience === 'parent'
  const anyFavorites =
    !family &&
    (occupationIds.some((id) => student.favorites.occupations.includes(id)) ||
      careers.some((career) => student.favorites.careers.includes(career.id)))
  return (
    <div className="grid items-start gap-4 lg:grid-cols-2">
      <Panel title="Ocupaciones afines">
        {matches.length ? (
          <ul className="space-y-3">
            {matches.map((match) => {
              const occupation = profileCatalog.occupations.find((item) => item.id === match.occupationId)!
              return (
                <li key={occupation.id}>
                  <Card className="space-y-3 rounded-lg bg-muted/20 p-4">
                    <h3 className="font-semibold">{occupation.name}</h3>
                    <p className="text-sm leading-relaxed">{occupation.description}</p>
                    <div className="flex flex-wrap gap-2">
                      <Badge variant={match.fit === 'very-high' ? 'default' : 'neutral'}>
                        {match.fit === 'very-high'
                          ? 'Ajuste muy alto'
                          : match.fit === 'high'
                            ? 'Ajuste alto'
                            : 'Ajuste bueno'}
                      </Badge>
                      {!family && student.favorites.occupations.includes(occupation.id) && (
                        <Badge variant="outline">Favorita</Badge>
                      )}
                      {!family &&
                        student.plans.some((plan) => occupation.careerIds.includes(plan.careerId)) && (
                          <Badge variant="outline" className="whitespace-normal">
                            Relacionada con sus planes
                          </Badge>
                        )}
                    </div>
                  </Card>
                </li>
              )
            })}
          </ul>
        ) : (
          <EmptyMessage>Aún no hay ocupaciones afines disponibles para este resultado.</EmptyMessage>
        )}
      </Panel>
      <Panel
        title={
          family ? 'Carreras que llevan a estas ocupaciones' : 'Carreras que conducen a esas ocupaciones'
        }
      >
        {careers.length ? (
          <ul className="space-y-3">
            {careers.map((career) => (
              <li key={career.id} className="space-y-2 rounded-lg border p-3">
                <h3 className="font-semibold">{career.name}</h3>
                <p className="text-sm leading-relaxed">{career.description}</p>
                <div className="flex flex-wrap gap-2">
                  {!family && student.favorites.careers.includes(career.id) && (
                    <Badge variant="outline">Favorita</Badge>
                  )}
                  {!family && student.plans.some((plan) => plan.careerId === career.id) && (
                    <Badge variant="secondary">En sus planes</Badge>
                  )}
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <EmptyMessage>Aún no hay carreras relacionadas disponibles.</EmptyMessage>
        )}
        {!family && !anyFavorites && (
          <p className="mt-4 text-muted-foreground">
            No ha marcado como favoritas ninguna de estas ocupaciones ni carreras.
          </p>
        )}
      </Panel>
    </div>
  )
}
