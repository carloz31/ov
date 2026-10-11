import { useState } from 'react'
import { useNavigate } from 'react-router'
import { StaffEntityHeader } from '@/components/staff/StaffEntityHeader'
import { StaffMetric } from '@/components/staff/StaffMetric'
import { appPaths } from '@/routes/paths'
import { ParentActivityCard } from '@/features/parent/components/ParentActivityCard'
import { ParentResourceDialog } from '@/features/parent/components/ParentResourceDialog'
import { parentRoute } from '@/features/parent/lib/selectors'
import { parentChildren } from '@/features/parent/data/parentPortal'
import { useParentPortalContext } from '@/features/parent/context/parentPortalContext'

function ParentActivitiesView() {
  const navigate = useNavigate()
  const { completedActivityIds, activities, available, journey: state } = useParentPortalContext()
  const [resources, setResources] = useState<string[]>([])
  const route = parentRoute(activities, parentChildren, completedActivityIds, available)
  const percentage = Math.round(route.percent)
  return (
    <div className="mx-auto max-w-5xl space-y-6 p-4 sm:p-6 lg:p-8">
      <StaffEntityHeader
        initials="AF"
        details={<p>Información para acompañar y conversar en casa.</p>}
        metrics={
          <StaffMetric
            primary
            label="Progreso general"
            value={`${percentage} %`}
            percent={percentage}
            detail={`${route.completed} de ${route.total} actividades`}
          />
        }
        title="Actividades para familias"
      />
      <section className="space-y-3" aria-label="Ruta de actividades">
        <div>
          <h2 className="font-bold">Para comprender el proceso</h2>
          <p className="text-sm text-muted-foreground">Contenido común para toda la familia.</p>
        </div>
        {route.assigned.map((activity) => (
          <ParentActivityCard
            activity={activity}
            completed={completedActivityIds.includes(activity.id)}
            inProgress={state.progress[activity.id]?.estado === 'en_curso'}
            locked={!available(activity)}
            key={activity.id}
            onStart={() =>
              navigate(
                `${appPaths.parent.activity(activity.id)}${completedActivityIds.includes(activity.id) ? '?repasar=1' : ''}`,
              )
            }
            onResources={setResources}
          />
        ))}
      </section>
      <ParentResourceDialog
        ids={resources}
        open={resources.length > 0}
        onOpenChange={(open) => {
          if (!open) setResources([])
        }}
      />
    </div>
  )
}
export { ParentActivitiesView }
