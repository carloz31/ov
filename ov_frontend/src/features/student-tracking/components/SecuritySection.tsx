import { diaryCounts } from '@/features/counselor/lib/classroomSelectors'
import { useState } from 'react'
import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/Collapsible'
import { displayDate, securityLabel, signalSummary } from '../lib/selectors'
import { EmptyMessage } from '@/features/student-tracking/components/EmptyMessage'
import { Panel } from '@/features/student-tracking/components/Panel'
import { TrendValue } from '@/features/student-tracking/components/TrendValue'
import type { StudentProfile } from '@/types/studentProfile'

function SignalTooltip({
  active,
  payload,
}: {
  active?: boolean
  payload?: readonly { payload?: StudentProfile['signals'][number] }[]
}) {
  const day = payload?.[0]?.payload
  if (!active || !day) return null
  return (
    <div className="max-w-[230px] space-y-2 rounded-lg border bg-card p-3 text-sm shadow-md">
      <p className="font-semibold">{displayDate(day.date)}</p>
      <p>
        {day.security === null
          ? 'Sin check-in este día'
          : `Seguridad: ${day.security} de 10 (${securityLabel(day.security)})`}
      </p>
      <p>Entradas de diario: {day.diaryEntries}</p>
    </div>
  )
}
export function SecuritySection({ student }: { student: StudentProfile }) {
  const summary = signalSummary(student)
  const diary = diaryCounts(student)
  const [open, setOpen] = useState(false)
  return (
    <div className="space-y-4">
      <Panel title="Entradas registradas">
        <p className="text-2xl font-bold">{diary.total} entradas en total</p>
        <dl className="mt-4 grid gap-3 sm:grid-cols-3">
          {(
            [
              ['Guiadas', diary.guided],
              ['Pregunta del día', diary.dailyPrompt],
              ['Libres', diary.free],
            ] as const
          ).map(([label, count]) => (
            <div key={label} className="rounded-lg border p-3">
              <dt className="text-sm text-muted-foreground">{label}</dt>
              <dd className="mt-1 text-xl font-bold">{count}</dd>
            </div>
          ))}
        </dl>
        {diary.unclassified > 0 && (
          <p className="mt-3 text-sm text-muted-foreground">
            {diary.unclassified} entradas sin tipo registrado.
          </p>
        )}
        {!student.signals.length && (
          <p className="mt-3 text-sm text-muted-foreground">
            Todavía no hay entradas ni sesiones registradas.
          </p>
        )}
      </Panel>
      <div className="grid min-w-0 items-start gap-4 lg:grid-cols-3">
        <div className="order-2 min-w-0 lg:order-1 lg:col-span-2">
          <Panel title="Seguridad y entradas de diario">
            {student.signals.length ? (
              <div
                className="h-[320px] min-w-0"
                aria-label="Seguridad vocacional y conteo de entradas por fecha"
              >
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart
                    accessibilityLayer
                    data={student.signals}
                    margin={{ top: 12, right: 0, left: 0, bottom: 6 }}
                  >
                    <CartesianGrid vertical={false} stroke="var(--data-grid)" strokeDasharray="3 3" />
                    <XAxis
                      dataKey="date"
                      tickFormatter={(value: string) => displayDate(value).split(' ').slice(0, 2).join(' ')}
                      axisLine={false}
                      tickLine={false}
                      minTickGap={35}
                      fontSize={11}
                      tick={{ fill: 'var(--muted-foreground)' }}
                    />
                    <YAxis
                      yAxisId="security"
                      domain={[1, 10]}
                      ticks={[1, 4, 7, 10]}
                      width={26}
                      axisLine={false}
                      tickLine={false}
                      fontSize={11}
                      tick={{ fill: 'var(--muted-foreground)' }}
                    />
                    <YAxis
                      yAxisId="diary"
                      orientation="right"
                      domain={[0, 'auto']}
                      allowDecimals={false}
                      width={24}
                      axisLine={false}
                      tickLine={false}
                      fontSize={11}
                      tick={{ fill: 'var(--muted-foreground)' }}
                    />
                    <Tooltip content={<SignalTooltip />} />
                    <Legend
                      formatter={(value) => <span className="text-foreground">{value}</span>}
                      wrapperStyle={{ fontSize: 12, paddingTop: 12 }}
                    />
                    <Line
                      yAxisId="security"
                      name="Seguridad (1 a 10)"
                      dataKey="security"
                      stroke="var(--data-primary)"
                      strokeWidth={2}
                      connectNulls={false}
                      dot={{ r: 3 }}
                      activeDot={{ r: 5 }}
                      isAnimationActive={false}
                    />
                    <Line
                      yAxisId="diary"
                      name="Entradas de diario"
                      dataKey="diaryEntries"
                      stroke="var(--data-baseline)"
                      strokeWidth={2}
                      strokeDasharray="5 4"
                      dot={false}
                      activeDot={{ r: 4 }}
                      isAnimationActive={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <EmptyMessage>Aún no registra check-ins de seguridad.</EmptyMessage>
            )}
            <Collapsible open={open} onOpenChange={setOpen}>
              <CollapsibleTrigger asChild>
                <Button className="mt-4 min-h-11 h-auto whitespace-normal" variant="outline">
                  {open ? 'Ocultar valores diarios' : 'Ver valores diarios'}
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <dl className="mt-4 space-y-3">
                  {student.signals.length ? (
                    student.signals.map((day) => (
                      <div key={day.date} className="space-y-1 rounded-lg border p-3">
                        <dt className="font-semibold">{displayDate(day.date)}</dt>
                        <dd>
                          {day.security === null
                            ? 'Sin check-in este día'
                            : `Seguridad: ${day.security} de 10 (${securityLabel(day.security)})`}
                        </dd>
                        <dd>{day.diaryEntries} entradas de diario</dd>
                        <dd className="text-sm text-muted-foreground">
                          {day.session ? 'Con sesión' : 'Sin sesión'}
                        </dd>
                      </div>
                    ))
                  ) : (
                    <p className="text-muted-foreground">Todavía no hay valores diarios registrados.</p>
                  )}
                </dl>
              </CollapsibleContent>
            </Collapsible>
          </Panel>
        </div>
        <div className="order-1 min-w-0 space-y-3 lg:order-2">
          <Card className="rounded-xl p-4">
            <h3 className="text-sm text-muted-foreground">Último check-in</h3>
            {summary.latest ? (
              <div className="mt-2 space-y-2">
                <p className="text-2xl font-bold">{summary.latest.security} de 10</p>
                <p>{securityLabel(summary.latest.security!)}</p>
                <p className="text-sm text-muted-foreground">{displayDate(summary.latest.date)}</p>
              </div>
            ) : (
              <p className="mt-2">Aún no registra check-ins de seguridad.</p>
            )}
          </Card>
          <Card className="rounded-xl p-4">
            <h3 className="mb-2 text-sm text-muted-foreground">Tendencia de su seguridad</h3>
            <TrendValue value={summary.securityTrend} />
          </Card>
          <Card className="rounded-xl p-4">
            <h3 className="text-sm text-muted-foreground">Entradas de diario por día con sesión</h3>
            <p className="mt-2 text-2xl font-bold">
              {summary.diaryAverage === null
                ? 'Sin sesiones registradas'
                : summary.diaryAverage.toLocaleString('es-PE', {
                    minimumFractionDigits: 1,
                    maximumFractionDigits: 1,
                  })}
            </p>
          </Card>
          <Card className="rounded-xl p-4">
            <h3 className="mb-2 text-sm text-muted-foreground">Tendencia de sus entradas</h3>
            <TrendValue value={summary.diaryTrend} />
          </Card>
          <p className="text-sm text-muted-foreground">Días con check-in: {summary.checkInDays}</p>
        </div>
      </div>
      <p className="rounded-xl border bg-card p-4 text-sm text-muted-foreground">
        Solo se muestra cuántas entradas registra. El contenido del diario es privado.
      </p>
    </div>
  )
}
