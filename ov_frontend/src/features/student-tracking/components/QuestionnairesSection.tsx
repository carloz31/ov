import { useState } from 'react'
import { BookOpenCheck } from 'lucide-react'

import { CardIcon } from '@/components/ui/Status'
import { Link } from 'react-router'
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/Accordion'

import { Button } from '@/components/ui/Button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/Select'
import { usePriorityCatalog } from '@/features/counselor/hooks/usePrioritySettings'

import { questionnaireUrl } from '@/features/student-tracking/lib/navigation'
import { EmptyMessage } from '@/features/student-tracking/components/EmptyMessage'
import { Panel } from '@/features/student-tracking/components/Panel'
import { PriorityLink } from '@/features/student-tracking/components/PriorityLink'
import { QuestionnaireStatus } from '@/features/student-tracking/components/QuestionnaireStatus'

import type { StudentProfile } from '@/types/studentProfile'
import { QuestionnaireBars } from '@/features/student-tracking/components/QuestionnaireBars'

export function QuestionnairesSection({ student, returnTo }: { student: StudentProfile; returnTo: string }) {
  const [filter, setFilter] = useState('priority')
  const { questionnaires } = usePriorityCatalog()
  const priority = questionnaires.filter((q) => q.priority)
  const visible = filter === 'priority' ? priority : questionnaires
  return (
    <div className="space-y-4">
      <Select value={filter} onValueChange={setFilter}>
        <SelectTrigger
          aria-label="Mostrar cuestionarios"
          className="min-h-11 w-full gap-2 bg-card text-base sm:w-auto"
        >
          <span>
            Mostrar: <SelectValue />
          </span>
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="priority">Prioritarios ({priority.length})</SelectItem>
          <SelectItem value="all">Todos ({questionnaires.length})</SelectItem>
        </SelectContent>
      </Select>
      {!visible.length ? (
        <Panel title="Cuestionarios">
          <EmptyMessage>Aún no marcas cuestionarios como prioritarios.</EmptyMessage>
          <Button className="mt-3 min-h-11" variant="outline" onClick={() => setFilter('all')}>
            Ver todos los cuestionarios
          </Button>
          <PriorityLink returnTo={returnTo} />
        </Panel>
      ) : (
        <Accordion type="multiple" className="space-y-3">
          {visible.map((definition) => {
            const application = student.questionnaires.find((q) => q.questionnaireId === definition.id)!
            return (
              <AccordionItem value={definition.id} key={definition.id}>
                <AccordionTrigger aria-label={`Ver resultados de ${definition.name}`}>
                  <span className="flex min-w-0 flex-1 items-center gap-3">
                    <CardIcon icon={BookOpenCheck} />
                    <span className="min-w-0 space-y-1">
                      <span className="staff-list-heading block font-semibold">{definition.name}</span>
                      <QuestionnaireStatus application={application} />
                    </span>
                  </span>
                </AccordionTrigger>
                <AccordionContent>
                  {application.result ? (
                    <div className="space-y-4">
                      <QuestionnaireBars definition={definition} result={application.result} />
                      <Button asChild variant="outline" className="min-h-11 h-auto whitespace-normal">
                        <Link to={questionnaireUrl(student.id, definition.id, returnTo)}>
                          Ver resultado completo
                        </Link>
                      </Button>
                    </div>
                  ) : (
                    <EmptyMessage unavailable>Aún no completa este cuestionario.</EmptyMessage>
                  )}
                </AccordionContent>
              </AccordionItem>
            )
          })}
        </Accordion>
      )}
    </div>
  )
}
