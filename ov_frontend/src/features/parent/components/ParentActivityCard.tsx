import { CheckCircle2, Circle, Clock3, Play, LockKeyhole, BookOpen } from 'lucide-react'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import type { Actividad } from '@/types/activities'

type ParentActivityCardProps = {
  activity: Actividad
  completed: boolean
  inProgress: boolean
  locked: boolean
  onStart: () => void
  onResources: (ids: string[]) => void
}
function ParentActivityCard({
  activity,
  completed,
  inProgress,
  locked,
  onStart,
  onResources,
}: ParentActivityCardProps) {
  return (
    <Card className="flex flex-col gap-4 p-5 shadow-[var(--shadow-card)] sm:flex-row sm:items-center">
      <div
        className={`flex size-11 shrink-0 items-center justify-center rounded-xl ${completed ? 'bg-[var(--success-soft)] text-success-text' : 'bg-[var(--primary-soft)] text-primary'}`}
      >
        {completed ? <CheckCircle2 /> : locked ? <LockKeyhole /> : <Circle />}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="staff-list-heading font-bold">{activity.titulo}</h3>
          <Badge variant={completed ? 'success' : 'neutral'}>
            {completed ? 'Completada' : locked ? 'Bloqueada' : inProgress ? 'En curso' : 'Disponible'}
          </Badge>
        </div>
        <p className="mt-1 text-sm leading-6 text-muted-foreground">{activity.subtitulo}</p>
        <span className="mt-2 inline-flex items-center gap-1 text-xs text-muted-foreground">
          <Clock3 className="size-3.5" /> {activity.duracionEstimadaMin} min
        </span>
        {locked && (
          <p className="mt-2 text-xs text-muted-foreground">Complete la actividad anterior para continuar.</p>
        )}
        {completed && !!activity.recompensa?.recursoIds?.length && (
          <div className="mt-3">
            <p className="text-xs font-semibold">Material de consulta</p>
            <Button
              className="mt-1 min-h-11"
              variant="outline"
              onClick={() => onResources(activity.recompensa?.recursoIds ?? [])}
            >
              <BookOpen /> Ver ficha
            </Button>
          </div>
        )}
      </div>
      <Button
        className="min-h-11 shrink-0"
        disabled={locked}
        onClick={onStart}
        variant={completed ? 'outline' : 'default'}
      >
        <Play /> {completed ? 'Repasar' : inProgress ? 'Continuar' : 'Comenzar'}
      </Button>
    </Card>
  )
}
export { ParentActivityCard }
