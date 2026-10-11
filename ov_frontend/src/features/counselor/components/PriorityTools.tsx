const questionnaireDescriptions: Record<string, string> = {
  interests: 'Intereses en tareas y entornos de trabajo.',
  social: 'Comunicación, empatía y cooperación.',
  intelligences: 'Formas de aprender y resolver tareas.',
  entry: 'Percepción al iniciar y finalizar el recorrido.',
  perception: 'Autoconocimiento, entorno y confianza al elegir.',
}

import { usePriorities } from '@/features/counselor/hooks/usePriorities'
import { SharingControl } from '@/features/counselor/components/SharingControl'
import { PriorityControl } from '@/features/counselor/components/PriorityControl'

import { Card } from '@/components/ui/Card'

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/Table'
import { TabsContent } from '@/components/ui/Tabs'
import { questionnaires } from '@/data/demo/studentProfiles'

export function PriorityTools({ model }: { model: ReturnType<typeof usePriorities> }) {
  return (
    <TabsContent value="tools" className="mt-0">
      <section className="min-w-0 space-y-3" aria-labelledby="questionnaires-heading">
        <h2 id="questionnaires-heading" className="text-lg font-bold">
          Herramientas
        </h2>
        <Card className="hidden overflow-hidden rounded-xl lg:block">
          <Table className="table-fixed [&_th:first-child]:pl-4 [&_td:first-child]:pl-4 [&_th:last-child]:pr-4 [&_td:last-child]:pr-4">
            <TableHeader className="bg-muted">
              <TableRow>
                <TableHead scope="col" className="w-[45%] text-sm font-semibold">
                  Herramienta
                </TableHead>
                <TableHead scope="col" className="w-[22%] text-sm font-semibold">
                  Prioritario
                </TableHead>
                <TableHead scope="col" className="w-[33%] text-sm font-semibold">
                  Visible para el apoderado
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {questionnaires.map((q) => (
                <TableRow key={q.id}>
                  <TableCell>
                    <p className="font-medium">{q.name}</p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {questionnaireDescriptions[q.id] ?? q.description}
                    </p>
                  </TableCell>
                  <TableCell>{<PriorityControl model={model} id={q.id} name={q.name} />}</TableCell>
                  <TableCell>{<SharingControl model={model} id={q.id} name={q.name} />}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
        <div className="space-y-3 lg:hidden">
          {questionnaires.map((q) => (
            <Card key={q.id} className="min-w-0 gap-3 rounded-xl p-4">
              <div>
                <h3 className="font-semibold">{q.name}</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  {questionnaireDescriptions[q.id] ?? q.description}
                </p>
              </div>
              <div className="text-sm">
                {<PriorityControl model={model} id={q.id} name={q.name} mobile={true} />}
                {<SharingControl model={model} id={q.id} name={q.name} mobile={true} />}
              </div>
            </Card>
          ))}
        </div>
        <div className="space-y-2 text-sm text-muted-foreground">
          <p>
            <strong className="font-medium text-foreground">Prioritario:</strong> se muestra en el filtro
            Prioritarios del perfil del estudiante para facilitar la revisión y cuenta para su avance
            prioritario.
          </p>
          <p>
            <strong className="font-medium text-foreground">Visible para el apoderado:</strong> el apoderado
            puede ver el resultado de su hijo cuando termine su propia ruta.
          </p>
        </div>
      </section>
    </TabsContent>
  )
}
