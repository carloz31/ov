import { number } from '@/features/counselor/lib/formatNumber'

import { useCounselorDashboard } from '@/features/counselor/hooks/useCounselorDashboard'

import { SegmentBar } from '@/features/counselor/components/SegmentBar'
import { Section } from '@/features/counselor/components/Section'

export function DashboardSecurity({ model }: { model: ReturnType<typeof useCounselorDashboard> }) {
  const { summary, descent } = model
  return (
    <Section title="Seguridad y diario">
      <div className="space-y-3">
        <div className="flex items-baseline justify-between gap-2">
          <h3 className="text-sm font-semibold">Seguridad</h3>
          <strong className="text-lg">
            {summary.security.average === null ? 'Sin datos' : `${number(summary.security.average)} de 10`}
          </strong>
        </div>
        <p className="text-xs text-muted-foreground">
          Último check-in · {summary.security.base} estudiantes con datos
        </p>
        <SegmentBar
          labels={summary.security.trends.map((row) => row.label)}
          values={summary.security.trends.map((row) => row.count)}
          colors={['bg-data-primary', 'bg-data-secondary', 'bg-neutral', 'bg-neutral-soft']}
        />
        <p className="text-xs">
          <strong>{descent}</strong> {descent === 1 ? 'estudiante en descenso' : 'estudiantes en descenso'}
        </p>
      </div>
      <div className="space-y-3 border-t pt-5">
        <div className="flex justify-between text-sm">
          <h3 className="font-semibold">Diario</h3>
          <strong>{summary.diary.total} entradas</strong>
        </div>
        <SegmentBar
          labels={
            summary.diary.unclassified
              ? ['Guiadas', 'Pregunta del día', 'Libres', 'Sin tipo']
              : ['Guiadas', 'Pregunta del día', 'Libres']
          }
          values={
            summary.diary.unclassified
              ? [
                  summary.diary.guided,
                  summary.diary.dailyPrompt,
                  summary.diary.free,
                  summary.diary.unclassified,
                ]
              : [summary.diary.guided, summary.diary.dailyPrompt, summary.diary.free]
          }
          colors={['bg-data-primary', 'bg-data-secondary', 'bg-neutral', 'bg-neutral-soft']}
        />
        {!summary.diary.total && (
          <p className="text-xs text-muted-foreground">Todavía no hay entradas registradas.</p>
        )}
        {summary.diary.unclassified > 0 && (
          <p className="text-xs text-muted-foreground">
            {summary.diary.unclassified} entradas sin tipo registrado.
          </p>
        )}
      </div>
      <p className="mt-auto text-xs text-muted-foreground">
        Solo conteos. El contenido del diario es privado.
      </p>
    </Section>
  )
}
