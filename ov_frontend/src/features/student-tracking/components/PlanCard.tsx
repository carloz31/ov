import { useState } from 'react'

import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/Collapsible'

import { Progress } from '@/components/ui/Progress'

import { profileCatalog } from '@/data/demo/studentProfiles'

import { affinities, displayDate, planCompleteness } from '@/features/student-tracking/lib/selectors'

import type { ProfilePlan, StudentProfile } from '@/types/studentProfile'

export function PlanCard({ plan, student }: { plan: ProfilePlan; student: StudentProfile }) {
  const [open, setOpen] = useState(false)
  const affinity = affinities(student, profileCatalog)
  const percent = planCompleteness(plan)
  const institution = profileCatalog.institutions.find((i) => i.id === plan.budget?.institutionId)
  const money = (value: number | null) =>
    value === null
      ? 'Sin completar'
      : new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'PEN' }).format(value)
  return (
    <Card className="min-w-0 rounded-xl p-4">
      <h3 className="text-lg font-bold">Plan {plan.slot}</h3>
      <p className="mt-2 font-medium">{profileCatalog.careers.find((c) => c.id === plan.careerId)?.name}</p>
      {institution && <p className="mt-2 text-muted-foreground">{institution.name}</p>}
      <div className="mt-4 space-y-2">
        <p>Completitud: {percent} %</p>
        <Progress aria-label={`Completitud del plan ${plan.slot}`} value={percent} />
        <p className="text-sm text-muted-foreground">Última actualización: {displayDate(plan.updatedAt)}</p>
        <p>{plan.actions.length} acciones de preparación</p>
        {affinity.careers.includes(plan.careerId) && (
          <Badge variant="secondary" className="whitespace-normal">
            Afín a su test de intereses
          </Badge>
        )}
      </div>
      <Collapsible open={open} onOpenChange={setOpen}>
        <CollapsibleTrigger asChild>
          <Button variant="outline" className="mt-4 min-h-11">
            {open ? 'Ocultar contenido' : 'Ver contenido'}
          </Button>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="mt-4 space-y-5 border-t pt-4">
            <section>
              <h4 className="font-semibold">Motivación</h4>
              <p className="mt-2 whitespace-pre-wrap">{plan.motivation || 'Sin completar'}</p>
            </section>
            {(
              [
                ['strengths', 'Fortalezas'],
                ['weaknesses', 'Debilidades'],
                ['opportunities', 'Oportunidades'],
                ['obstacles', 'Obstáculos'],
              ] as const
            ).map(([key, label]) => (
              <section key={key}>
                <h4 className="font-semibold">{label}</h4>
                <p className="mt-2 whitespace-pre-wrap">{plan.swot[key] || 'Sin completar'}</p>
              </section>
            ))}
            <section>
              <h4 className="font-semibold">Presupuesto</h4>
              {plan.budget ? (
                <dl className="mt-2 space-y-3">
                  {[
                    ['Institución', institution?.name ?? 'Sin completar'],
                    ['Pensión', money(plan.budget.tuition)],
                    ['Matrícula', money(plan.budget.enrollment)],
                    ['Vivienda', money(plan.budget.housing)],
                    ['Becas', plan.budget.scholarship || 'Sin completar'],
                  ].map(([label, value]) => (
                    <div key={label}>
                      <dt className="text-sm text-muted-foreground">{label}</dt>
                      <dd>{value}</dd>
                    </div>
                  ))}
                </dl>
              ) : (
                <p className="mt-2 text-muted-foreground">Sin completar</p>
              )}
            </section>
            <section>
              <h4 className="font-semibold">Acciones de preparación</h4>
              {plan.actions.length ? (
                <ul className="mt-2 space-y-3">
                  {plan.actions.map((action, i) => (
                    <li key={i}>
                      <p>{action.description || 'Sin completar'}</p>
                      <p className="mt-1 text-sm text-muted-foreground">{displayDate(action.date)}</p>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-2 text-muted-foreground">Sin completar</p>
              )}
            </section>
          </div>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  )
}
