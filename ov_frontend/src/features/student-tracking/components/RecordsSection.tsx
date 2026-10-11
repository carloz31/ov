import { useProfileRecords } from '@/features/student-tracking/hooks/useProfileRecords'
import { CardIcon, AlertBadge } from '@/components/ui/Status'

import { ClipboardList, Search } from 'lucide-react'

import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/Accordion'

import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'

import { Input } from '@/components/ui/Input'

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/Select'

import { blocks } from '@/data/demo/studentProfiles'

import { displayDate, observationCounts } from '@/features/student-tracking/lib/selectors'

import { ActivityStatus } from '@/features/student-tracking/components/ActivityStatus'
import { EmptyMessage } from '@/features/student-tracking/components/EmptyMessage'
import { Observations } from '@/features/student-tracking/components/Observations'
import { Panel } from '@/features/student-tracking/components/Panel'
import { PriorityLink } from '@/features/student-tracking/components/PriorityLink'
import type { StudentProfile } from '@/types/studentProfile'

export function RecordsSection({
  student,
  returnTo,
  attention = false,
}: {
  student: StudentProfile
  returnTo: string
  attention?: boolean
}) {
  const { filter, setFilter, query, setQuery, open, setOpen, all, priority, visible, started } =
    useProfileRecords(student, attention)
  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative min-w-0 flex-1">
          <Search
            aria-hidden
            className="pointer-events-none absolute top-1/2 left-3 size-5 -translate-y-1/2 text-muted-foreground"
          />
          <Input
            type="search"
            aria-label="Buscar actividad"
            placeholder="Buscar actividad"
            className="min-h-11 bg-card pl-10 text-base"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <Select value={filter} onValueChange={setFilter}>
          <SelectTrigger
            aria-label="Mostrar registros"
            className="min-h-11 w-full gap-2 bg-card text-base sm:w-auto"
          >
            <span>
              Mostrar: <SelectValue />
            </span>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="priority">Prioritarios ({priority.length})</SelectItem>
            <SelectItem value="all">Todos ({all.length})</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <Card className="space-y-3 rounded-xl p-4 text-sm">
        <p>
          <AlertBadge className="mr-2">Poco desarrollada</AlertBadge>
          La respuesta final quedó breve o no desarrolló lo que se pedía.
        </p>
        <p>
          <AlertBadge critical className="mr-2">
            Requiere atención
          </AlertBadge>
          La respuesta podría indicar algo que conviene conversar con el estudiante.
        </p>
      </Card>
      {!started && <EmptyMessage>Todavía no ha respondido actividades de registro.</EmptyMessage>}
      {filter === 'priority' && !priority.length ? (
        <Panel title="Registros">
          <EmptyMessage>Aún no marcas actividades de registro como prioritarias.</EmptyMessage>
          <Button className="mt-3 min-h-11" variant="outline" onClick={() => setFilter('all')}>
            Ver todos los registros
          </Button>
          <PriorityLink returnTo={returnTo} />
        </Panel>
      ) : !visible.length ? (
        <EmptyMessage>No hay actividades que coincidan con tu búsqueda.</EmptyMessage>
      ) : (
        <Accordion type="multiple" value={open} onValueChange={setOpen} className="space-y-3">
          {visible.map((activity) => {
            const entry = student.activities.find((a) => a.activityId === activity.id)!
            const observations = observationCounts(student, activity.id)
            return (
              <AccordionItem key={activity.id} value={activity.id}>
                <AccordionTrigger
                  aria-label={`Ver respuesta de ${activity.title}`}
                  className="flex-wrap sm:flex-nowrap"
                >
                  <span className="flex min-w-0 flex-1 items-start gap-3">
                    <CardIcon icon={ClipboardList} />
                    <span className="min-w-0 space-y-2">
                      <span className="staff-list-heading block font-semibold">{activity.title}</span>
                      <span className="block text-sm text-muted-foreground">
                        {blocks.find((b) => b.id === activity.blockId)?.name}
                      </span>
                      <ActivityStatus
                        state={entry.state}
                        label={
                          entry.state === 'completed'
                            ? 'Completada'
                            : entry.state === 'in-progress'
                              ? 'En progreso'
                              : 'No iniciada'
                        }
                      />
                      {entry.state !== 'not-started' && (
                        <span className="block text-sm text-muted-foreground">
                          {entry.state === 'completed' ? 'Completada' : 'Última modificación'}:{' '}
                          {displayDate(entry.completedAt ?? entry.updatedAt)}
                        </span>
                      )}
                      {observations.underdeveloped || observations.attention ? (
                        <Observations {...observations} counts />
                      ) : (
                        <span className="block text-sm text-muted-foreground">Sin observaciones</span>
                      )}
                    </span>
                  </span>
                  <span className="shrink-0 text-sm font-medium text-primary">
                    {open.includes(activity.id) ? 'Ocultar respuesta' : 'Ver respuesta'}
                  </span>
                </AccordionTrigger>
                <AccordionContent>
                  <div className="space-y-5">
                    {activity.items?.map((item) => {
                      const answer = entry.answers.find((a) => a.itemId === item.id)
                      return (
                        <section className="space-y-2" key={item.id}>
                          <h3 className="font-semibold">{item.name}</h3>
                          <p className="text-sm text-muted-foreground">{item.prompt}</p>
                          {answer ? (
                            <>
                              <p className="rounded-lg bg-muted/50 p-3 leading-relaxed whitespace-pre-wrap">
                                {answer.text}
                              </p>
                              <p className="text-sm text-muted-foreground">
                                Última modificación: {displayDate(answer.date)}
                              </p>
                              <Observations
                                underdeveloped={Number(answer.underdeveloped)}
                                attention={Number(answer.attention)}
                              />
                            </>
                          ) : (
                            <EmptyMessage>Sin respuesta todavía</EmptyMessage>
                          )}
                        </section>
                      )
                    })}
                  </div>
                </AccordionContent>
              </AccordionItem>
            )
          })}
        </Accordion>
      )}
    </div>
  )
}
