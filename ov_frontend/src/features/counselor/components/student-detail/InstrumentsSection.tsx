import { Badge } from '@/components/ui/Badge'

import { Card } from '@/components/ui/Card'

import { getStudentTagRows } from '@/features/counselor/lib/counselorPortalSelectors'
import { useCounselorPortal } from '@/features/counselor/context/counselorPortalContext'
import { Delta } from '@/features/counselor/components/Delta'
import type { Student } from '@/features/counselor/types'

export function InstrumentsSection({ student }: { student: Student }) {
  const { state } = useCounselorPortal()
  const rows = getStudentTagRows(state, student)
  return (
    <div className="space-y-5">
      <div>
        <h2 className="mb-3 font-bold">Tests de Me conozco</h2>
        <div className="grid gap-4 md:grid-cols-2">
          {student.testResults.map((test) => (
            <Card className="p-5" key={test.name}>
              <h3 className="font-bold">{test.name}</h3>
              <p className="mt-3 text-lg font-semibold text-primary">{test.summary}</p>
              <ul className="mt-3 list-inside list-disc text-sm text-muted-foreground">
                {test.details.map((detail) => (
                  <li key={detail}>{detail}</li>
                ))}
              </ul>
            </Card>
          ))}
        </div>
      </div>
      <Card className="p-5">
        <h2 className="font-bold">Cuestionario de entrada</h2>
        <div className="mt-4 space-y-3">
          {student.entranceAnswers.map((item) => (
            <div className="rounded-xl bg-muted/50 p-3" key={item.question}>
              <p className="text-xs font-semibold text-muted-foreground">{item.question}</p>
              <p className="mt-1 text-sm">{item.answer}</p>
            </div>
          ))}
        </div>
      </Card>
      <Card className="overflow-x-auto">
        <div className="border-b p-5">
          <h2 className="font-bold">Autopercepción · entrada vs. salida</h2>
        </div>
        <table className="w-full min-w-[650px] text-left text-sm [&_td:last-child]:pr-8 [&_th:last-child]:pr-8">
          <thead className="border-b bg-muted/40 text-xs text-muted-foreground">
            <tr>
              <th className="p-4">Tema</th>
              <th>Entrada</th>
              <th>Salida</th>
              <th>Variación</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {rows.map((row) => (
              <tr key={row.tag.id}>
                <td className="p-4">
                  <details>
                    <summary className="cursor-pointer font-medium">
                      {row.tag.code} · {row.tag.name}
                    </summary>
                    <div className="mt-3 space-y-2">
                      {state.perceptionItems
                        .filter((item) => item.tagIds.includes(row.tag.id))
                        .map((item) => {
                          const entry = student.perceptions.find((app) => app.moment === 'ENTRADA')?.answers[
                            item.id
                          ]
                          const exit = student.perceptions.find((app) => app.moment === 'SALIDA')?.answers[
                            item.id
                          ]
                          return (
                            <p className="text-xs font-normal text-muted-foreground" key={item.id}>
                              {item.statement} · {entry ?? '—'} → {exit ?? '—'}{' '}
                              {item.direction === 'NEUTRA' && <Badge variant="outline">Sin dirección</Badge>}
                            </p>
                          )
                        })}
                    </div>
                  </details>
                </td>
                <td>{row.entry?.toFixed(1) ?? '—'}</td>
                <td>{row.exit?.toFixed(1) ?? '—'}</td>
                <td>
                  <Delta value={row.delta} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  )
}
