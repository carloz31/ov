import { useStudentProgress } from '@/features/counselor/hooks/useStudentProgress'
import { CircleCheck, CircleHelp, ChevronDown, ChevronRight, Eye, Minus, MoreHorizontal } from 'lucide-react'

import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/DropdownMenu'
import { appPaths } from '@/routes/paths'

import type { Student } from '@/features/counselor/types'
import { CircleMetric } from '@/features/counselor/components/student-detail/CircleMetric'
import { activityTypeLabel } from '@/features/counselor/lib/labels'

export function ProgressSection({ student }: { student: Student }) {
  const {
    navigate,
    groupBy,
    setGroupBy,
    collapsedGroups,
    setCollapsedGroups,
    progress,
    activities,
    records,
    observedCount,
    weeks,
    orderedGroups,
    completedCount,
  } = useStudentProgress(student)
  return (
    <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,7fr)_minmax(17rem,3fr)]">
      <div className="space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold">Actividades</h2>
            <p className="text-sm text-muted-foreground">
              Consulta el avance y abre las respuestas de registro.
            </p>
          </div>
          <div className="flex rounded-xl border p-1">
            <Button
              onClick={() => setGroupBy('block')}
              size="sm"
              variant={groupBy === 'block' ? 'default' : 'ghost'}
            >
              Por bloque
            </Button>
            <Button
              onClick={() => setGroupBy('type')}
              size="sm"
              variant={groupBy === 'type' ? 'default' : 'ghost'}
            >
              Por tipo
            </Button>
          </div>
        </div>
        {orderedGroups.map(([group, rows]) => {
          const groupCompleted = rows.filter((activity) =>
            activity.type === 'CASO'
              ? student.completedCaseIds.includes(activity.id)
              : student.progress.some(
                  (item) => item.activityId === activity.id && item.status === 'COMPLETADA',
                ),
          ).length
          const collapsed = collapsedGroups.has(group)
          return (
            <Card className="overflow-hidden" key={group}>
              <button
                aria-expanded={!collapsed}
                className="flex w-full items-center justify-between gap-4 border-b bg-muted/40 px-6 py-4 text-left"
                onClick={() =>
                  setCollapsedGroups((current) => {
                    const next = new Set(current)
                    if (next.has(group)) next.delete(group)
                    else next.add(group)
                    return next
                  })
                }
                type="button"
              >
                <span>
                  <span className="block font-bold">{group}</span>
                  <span className="text-xs text-muted-foreground">
                    {groupCompleted} de {rows.length} actividades completadas
                  </span>
                </span>
                {collapsed ? <ChevronRight className="size-5" /> : <ChevronDown className="size-5" />}
              </button>
              {!collapsed && (
                <div className="divide-y">
                  {rows.map((activity) => {
                    const progressRow = student.progress.find((item) => item.activityId === activity.id)
                    const record = records.find((item) => item.activityId === activity.id)
                    const complete =
                      activity.type === 'CASO'
                        ? student.completedCaseIds.includes(activity.id)
                        : progressRow?.status === 'COMPLETADA'
                    const completedAt =
                      activity.type === 'CASO'
                        ? student.completedCaseDates[activity.id]
                        : progressRow?.completedAt
                    const observed = Boolean(record && record.preliminaryReview === 'OBSERVADO')
                    return (
                      <div className="flex flex-wrap items-center gap-4 px-6 py-4" key={activity.id}>
                        <span
                          className={`inline-flex size-7 shrink-0 items-center justify-center rounded-full ${complete ? 'bg-success-soft text-success-text' : 'bg-muted text-muted-foreground'}`}
                        >
                          {complete ? <CircleCheck className="size-4" /> : <Minus className="size-4" />}
                        </span>
                        <div className="min-w-52 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <strong className="text-sm">
                              {activity.code} · {activity.name}
                            </strong>
                            {activity.type === 'REGISTRO' && observed && (
                              <span
                                aria-label="Registro observado"
                                title="Registro observado"
                                className="inline-flex size-5 items-center justify-center rounded-full bg-primary-soft text-primary"
                              >
                                <CircleHelp className="size-3.5" />
                              </span>
                            )}
                          </div>
                          <p className="mt-1 text-xs text-muted-foreground">
                            {activity.type === 'TEST'
                              ? `Instrumento: ${activity.name}`
                              : activityTypeLabel(activity.type)}{' '}
                            ·{' '}
                            {complete && completedAt
                              ? `Completada ${new Date(completedAt).toLocaleDateString('es-PE')}`
                              : 'No completada'}
                          </p>
                        </div>
                        {activity.type === 'REGISTRO' && record && (
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                aria-label={`Acciones para ${activity.name}`}
                                size="icon"
                                variant="ghost"
                              >
                                <MoreHorizontal />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem
                                onSelect={() =>
                                  navigate(appPaths.counselor.studentRecord(student.id, record.id))
                                }
                              >
                                <Eye /> Ver respuesta
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </Card>
          )
        })}
      </div>
      <aside className="space-y-5 lg:sticky lg:top-4">
        <Card className="grid grid-cols-3 gap-2 p-4">
          <CircleMetric
            completed={completedCount}
            label="Avance total"
            percent={activities.length ? Math.round((completedCount / activities.length) * 100) : 100}
            total={activities.length}
          />
          <CircleMetric
            completed={progress.completed}
            label="Registros prioritarios"
            percent={progress.percent}
            total={progress.total}
          />
          <div className="flex min-w-0 flex-col items-center text-center">
            <div className="grid size-16 place-items-center rounded-full border-8 border-border text-xl font-bold text-primary">
              {observedCount}
            </div>
            <p className="mt-2 text-[11px] font-semibold leading-tight">Registros observados</p>
            <p className="mt-1 text-[10px] leading-tight text-muted-foreground">requieren seguimiento</p>
          </div>
        </Card>
        <Card className="p-5">
          <h3 className="font-bold">Ritmo semanal</h3>
          <p className="text-xs text-muted-foreground">Actividades completadas en las últimas 5 semanas.</p>
          <div className="mt-5 flex h-48 items-end gap-3">
            {Array.from({ length: 5 }, (_, index) => 4 - index).map((week) => (
              <div className="flex flex-1 flex-col items-center gap-2" key={week}>
                <strong className="text-xs">{weeks[week] ?? 0}</strong>
                <div
                  className="w-full rounded-t-lg bg-primary"
                  style={{ height: `${Math.max(8, (weeks[week] ?? 0) * 26)}px` }}
                />
                <span className="text-[10px] text-muted-foreground">
                  {week === 0 ? 'Actual' : `-${week}`}
                </span>
              </div>
            ))}
          </div>
        </Card>
      </aside>
    </div>
  )
}
