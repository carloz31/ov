import { useParentOverview } from '@/features/parent/hooks/useParentOverview'
import { Award, ArrowRight, BookOpenCheck, Check } from 'lucide-react'
import { Link } from 'react-router'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { CardIcon } from '@/components/ui/Status'
import { appPaths } from '@/routes/paths'

import { parentMotivation } from '@/features/parent/data/parentMotivation'

export function ParentRouteSummary({ model }: { model: ReturnType<typeof useParentOverview> }) {
  const { diplomaRef, highlightDiploma, completedActivityIds, route } = model
  return (
    <Card className="parent-route-card flex min-w-0 flex-col gap-5 p-5 sm:p-6">
      <div className="flex items-center gap-3">
        <CardIcon icon={route.complete ? Award : BookOpenCheck} />
        <h2 className="text-lg font-bold">Mis actividades</h2>
        <Badge variant={route.complete ? 'success' : 'default'} className="ml-auto">
          {route.complete ? 'Ruta completada' : 'Tu ruta'}
        </Badge>
      </div>
      {route.complete ? (
        <div
          ref={diplomaRef}
          tabIndex={-1}
          aria-labelledby="parent-diploma-title"
          className={`parent-diploma-recognition flex items-center gap-4 rounded-xl border bg-primary-soft p-4 ${highlightDiploma ? 'parent-diploma-highlight' : ''}`}
        >
          <Award className="size-10 shrink-0 text-primary" aria-hidden />
          <div>
            <p className="text-xs text-muted-foreground">Diploma de tu recorrido</p>
            <h3 id="parent-diploma-title" className="font-bold">
              Conozco mi rol
            </h3>
            <p className="mt-1 text-sm">Completaste tu ruta</p>
          </div>
        </div>
      ) : (
        <ol className="flex flex-wrap items-center gap-3" aria-label="Pasos de tu ruta">
          {route.assigned.map((activity, index) => (
            <li key={activity.id} className="flex items-center gap-2 text-xs">
              <span
                className={`grid size-8 place-items-center rounded-full ${completedActivityIds.includes(activity.id) ? 'bg-success-soft text-success-text' : route.next?.id === activity.id ? 'bg-primary-soft font-bold text-primary ring-1 ring-primary' : 'bg-neutral-soft text-muted-foreground'}`}
              >
                {completedActivityIds.includes(activity.id) ? (
                  <Check className="size-4" aria-hidden />
                ) : (
                  index + 1
                )}
              </span>
              <span className="text-sm">
                {activity.titulo}: {completedActivityIds.includes(activity.id) ? 'Completada' : 'Pendiente'}
              </span>
            </li>
          ))}
        </ol>
      )}
      <div className="mt-auto space-y-3">
        {!route.complete && route.next && <p className="text-sm font-semibold">{route.next.titulo}</p>}
        <Button
          asChild
          variant={route.complete ? 'outline' : 'default'}
          className="min-h-11 h-auto max-w-full whitespace-normal"
        >
          <Link
            to={
              route.complete || !route.next
                ? appPaths.parent.activities
                : appPaths.parent.activity(route.next.id)
            }
          >
            {route.complete ? 'Repasar mis actividades' : 'Continuar'}
            <ArrowRight className="shrink-0" aria-hidden />
          </Link>
        </Button>
        <p className="text-sm text-muted-foreground">{parentMotivation('activities')}</p>
      </div>
    </Card>
  )
}
