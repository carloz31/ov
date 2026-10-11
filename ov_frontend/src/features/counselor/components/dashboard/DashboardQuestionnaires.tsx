import { useCounselorDashboard } from '@/features/counselor/hooks/useCounselorDashboard'

import { Badge } from '@/components/ui/Badge'

import { StateBar } from '@/features/counselor/components/StateBar'
import { StateCounts } from '@/features/counselor/components/StateCounts'
import { StateLegend } from '@/features/counselor/components/StateLegend'
import { Section } from '@/features/counselor/components/Section'
import { ConfigurePriorities } from '@/features/counselor/components/ConfigurePriorities'

export function DashboardQuestionnaires({ model }: { model: ReturnType<typeof useCounselorDashboard> }) {
  const { questionRows } = model
  return (
    <Section title="Cuestionarios">
      {questionRows.length ? (
        <>
          <StateLegend />
          <div className="space-y-5">
            {questionRows.slice(0, 5).map((row) => (
              <div key={row.definition.id} className="space-y-2">
                <div className="flex items-start justify-between gap-3 text-sm">
                  <h3 className="font-semibold">{row.definition.name}</h3>
                  <StateCounts completed={row.completed} progress={row.progress} pending={row.pending} />
                </div>
                <StateBar completed={row.completed} progress={row.progress} pending={row.pending} />
                {row.definition.kind === 'comparison' ? (
                  <p className="text-xs text-muted-foreground">
                    {row.entry ? `Subieron: ${row.increased} de ${row.exit} con salida` : 'Sin resultados'}
                    {row.entry > row.exit ? ` · ${row.entry - row.exit} con salida pendiente` : ''}
                  </p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {row.frequent.slice(0, 2).map((dimension) => (
                      <Badge
                        key={dimension.id}
                        variant="secondary"
                        className="bg-primary-soft px-2 py-1 text-xs font-normal text-foreground"
                      >
                        {dimension.name}: {dimension.count}
                      </Badge>
                    ))}
                    {row.flat > 0 && (
                      <span className="text-xs text-muted-foreground">Perfil plano: {row.flat}</span>
                    )}
                    {!row.frequent.length && !row.flat && (
                      <span className="text-xs text-muted-foreground">Sin resultados</span>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
          {questionRows.length > 5 && (
            <p className="text-xs text-muted-foreground">
              y {questionRows.length - 5} cuestionarios más en el perfil de cada estudiante
            </p>
          )}
        </>
      ) : (
        <>
          <p className="text-sm text-muted-foreground">Sin cuestionarios prioritarios configurados.</p>
          <ConfigurePriorities />
        </>
      )}
    </Section>
  )
}
