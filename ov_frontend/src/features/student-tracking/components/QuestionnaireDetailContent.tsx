import { Card } from '@/components/ui/Card'

import { changeSummary, isFlatProfile } from '@/features/student-tracking/lib/selectors'

import { EmptyMessage } from '@/features/student-tracking/components/EmptyMessage'
import { Panel } from '@/features/student-tracking/components/Panel'
import { DimensionCards } from '@/features/student-tracking/components/DimensionCards'

import type { QuestionnaireDefinition, QuestionnaireResult, StudentProfile } from '@/types/studentProfile'
import { QuestionnaireBars } from '@/features/student-tracking/components/QuestionnaireBars'
import { InterestDetails } from '@/features/student-tracking/components/InterestDetails'

export function QuestionnaireDetailContent({
  student,
  definition,
  result,
  audience = 'counselor',
}: {
  student: StudentProfile
  definition: QuestionnaireDefinition
  result?: QuestionnaireResult
  audience?: 'counselor' | 'parent'
}) {
  return (
    <div className="space-y-5">
      <Panel title="Qué mide este cuestionario">
        <p>{definition.description}</p>
      </Panel>
      <Panel title="Cómo leer este resultado">
        <p>{definition.interpretation}</p>
        <p className="mt-3 text-muted-foreground">
          {audience === 'parent'
            ? `Estos resultados son exploratorios. Sirven para conversar con ${student.nombres} sobre lo que le gusta y en lo que destaca, no para decidir qué debe estudiar.`
            : 'Este resultado es exploratorio y sirve para orientar la conversación con el estudiante. No es un diagnóstico.'}
        </p>
      </Panel>
      {result ? (
        <>
          <Panel title="Resultado por dimensión">
            {result.kind === 'comparison' && result.exit && (
              <p className="mb-4">{changeSummary(result)} dimensiones.</p>
            )}
            <QuestionnaireBars
              definition={definition}
              result={result}
              expanded
              audience={audience}
              childName={student.nombres}
            />
          </Panel>
          <Panel title="Qué significa cada dimensión">
            <DimensionCards definition={definition} result={result} />
          </Panel>
          {result.kind === 'interests' && (
            <InterestDetails student={student} result={result} audience={audience} />
          )}
          {audience === 'parent' && result.kind === 'interests' && !isFlatProfile(result.values) && (
            <Card className="space-y-4 rounded-xl border-border bg-primary-soft p-5 sm:p-6">
              <h2 className="text-lg font-bold">Cómo tomar estas recomendaciones</h2>
              <ul className="list-disc space-y-3 pl-5">
                <li>
                  Son puntos de partida para explorar, no una lista de lo que {student.nombres} debe estudiar.
                </li>
                <li>
                  Una misma carrera puede llevar a varias ocupaciones, y una ocupación puede alcanzarse por
                  caminos distintos.
                </li>
                <li>
                  Lo más valioso es conversar con {student.nombres} sobre qué le atrae de estas opciones y qué
                  no.
                </li>
                <li>
                  La decisión final es de {student.nombres}. Tu apoyo es acompañar a {student.nombres} a
                  informarse y a elegir.
                </li>
              </ul>
            </Card>
          )}
        </>
      ) : (
        <EmptyMessage unavailable>Aún no completa este cuestionario.</EmptyMessage>
      )}
    </div>
  )
}
