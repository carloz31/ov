import { useParentOverview } from '@/features/parent/hooks/useParentOverview'
import { BookOpenCheck, LockKeyhole } from 'lucide-react'
import { Link } from 'react-router'

import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { CardIcon } from '@/components/ui/Status'

import { StaffEntityHeader } from '@/components/staff/StaffEntityHeader'
import { StaffMetric } from '@/components/staff/StaffMetric'
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/Accordion'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/Tabs'
import { appPaths } from '@/routes/paths'
import { parentChildren } from '@/features/parent/data/parentPortal'

import { completeFamilyResult, parentResultUrl } from '@/features/parent/lib/selectors'
import { displayDate } from '@/features/student-tracking/lib/selectors'
import { QuestionnaireBars } from '@/features/student-tracking/components/QuestionnaireBars'

export function ParentChildrenSummary({ model }: { model: ReturnType<typeof useParentOverview> }) {
  const { params, setParams, child, route, shared, student, progress } = model
  return (
    <section className="space-y-5" aria-labelledby="family-children">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h2 id="family-children" className="text-xl font-bold">
          Mis hijos
        </h2>
        {parentChildren.length > 1 && child && (
          <Tabs
            value={child.id}
            onValueChange={(id) => {
              const next = new URLSearchParams(params)
              next.set('child', id)
              setParams(next)
            }}
          >
            <TabsList appearance="navigation" className="h-auto">
              {parentChildren.map((item) => (
                <TabsTrigger key={item.id} value={item.id} className="min-h-11">
                  {item.name.split(' ')[0]}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        )}
      </div>
      {child && student && progress ? (
        <StaffEntityHeader
          title={child.name}
          initials={child.initials}
          heading="h3"
          details={<p>Salón: {student.salon}</p>}
          metrics={
            <>
              <StaffMetric
                primary
                label={`Avance de ${student.nombres}`}
                value={`${progress.percent} %`}
                percent={progress.percent}
                detail={`${progress.completed} de ${progress.total} actividades`}
              />
              <StaffMetric
                label="Su avance hacia el diploma"
                value={`${Math.round(route.percent)} %`}
                percent={route.percent}
                detail={`${route.completed} de ${route.total} actividades`}
              />
            </>
          }
        >
          <div className="space-y-5 border-t pt-6">
            <h3 className="text-lg font-bold">Resultados de sus cuestionarios</h3>
            <p className="rounded-xl border bg-muted/40 p-4 text-sm leading-relaxed">
              Estos resultados son exploratorios. Sirven para conversar con {student.nombres} sobre lo que le
              gusta y en lo que destaca, no para decidir qué debe estudiar.
            </p>
            {!shared.length ? (
              <p className="text-sm text-muted-foreground">
                Por ahora no hay resultados compartidos con las familias.
              </p>
            ) : !route.complete ? (
              <div className="space-y-4">
                <div className="flex items-start gap-3 rounded-xl border p-4">
                  <LockKeyhole className="mt-0.5 size-5 shrink-0 text-primary" aria-hidden />
                  <p className="text-sm">
                    Podrás ver los resultados de {student.nombres} cuando completes tus actividades.
                  </p>
                </div>
                <Button asChild variant="outline" className="min-h-11">
                  <Link to={appPaths.parent.activities}>Ir a mis actividades</Link>
                </Button>
                <p className="text-sm font-semibold">Cuestionarios que se compartirán</p>
                <ul className="list-disc space-y-2 pl-5 text-sm">
                  {shared.map((definition) => (
                    <li key={definition.id}>{definition.name}</li>
                  ))}
                </ul>
              </div>
            ) : (
              <Accordion type="multiple" className="space-y-3">
                {shared.map((definition) => {
                  const application = student.questionnaires.find((q) => q.questionnaireId === definition.id)
                  const ready = completeFamilyResult(application)
                  return (
                    <AccordionItem key={definition.id} value={definition.id}>
                      <AccordionTrigger
                        aria-label={`Ver resultados de ${definition.name}`}
                        className="min-h-11"
                      >
                        <span className="flex min-w-0 flex-1 items-center gap-3">
                          <CardIcon icon={BookOpenCheck} />
                          <span className="min-w-0 space-y-2">
                            <span className="staff-list-heading block font-semibold">{definition.name}</span>
                            <Badge variant={ready ? 'success' : 'neutral'} className="font-normal">
                              {ready
                                ? `Completado · ${displayDate(application?.completedAt)}`
                                : 'Aún no lo completa'}
                            </Badge>
                          </span>
                        </span>
                      </AccordionTrigger>
                      <AccordionContent>
                        {ready && application?.result ? (
                          <div className="space-y-5">
                            <QuestionnaireBars
                              definition={definition}
                              result={application.result}
                              audience="parent"
                              childName={student.nombres}
                            />
                            <Button asChild variant="outline" className="min-h-11">
                              <Link to={parentResultUrl(child.id, definition.id)}>
                                Ver resultado completo
                              </Link>
                            </Button>
                          </div>
                        ) : (
                          <p className="text-sm text-muted-foreground">Aún no lo completa.</p>
                        )}
                      </AccordionContent>
                    </AccordionItem>
                  )
                })}
              </Accordion>
            )}
          </div>
        </StaffEntityHeader>
      ) : (
        <p className="text-muted-foreground">No hay hijos asociados a esta cuenta.</p>
      )}
    </section>
  )
}
