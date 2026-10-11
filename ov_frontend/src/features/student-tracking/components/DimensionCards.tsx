import { ChangeLabel } from '@/features/student-tracking/components/ChangeLabel'
import { dimensionIcon } from '../lib/presentation'
import { Badge } from '@/components/ui/Badge'
import { Card } from '@/components/ui/Card'
import { changes, highlightedDimensions, levelLabel } from '../lib/selectors'
import type { QuestionnaireDefinition, QuestionnaireResult } from '@/types/studentProfile'

export function DimensionCards({
  definition,
  result,
}: {
  definition: QuestionnaireDefinition
  result: QuestionnaireResult
}) {
  const featured = result.kind === 'highlights' ? highlightedDimensions(result.values) : []
  const comparisons = result.kind === 'comparison' ? changes(result) : []
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {definition.dimensions.map((dimension) => {
        const value =
          result.kind === 'comparison' ? undefined : result.values.find((v) => v.dimensionId === dimension.id)
        const comparison = comparisons.find((row) => row.dimensionId === dimension.id)
        const Icon = dimensionIcon(dimension.id)
        return (
          <Card key={dimension.id} className="flex min-w-0 flex-col rounded-xl p-4">
            <h3 className="flex flex-wrap items-center gap-2 font-bold">
              <Icon className="size-4 shrink-0 text-primary" aria-hidden />
              {dimension.name}
              {featured.includes(dimension.id) && <Badge variant="secondary">Destacada</Badge>}
            </h3>
            <p className="mt-3 text-sm leading-relaxed">{dimension.description}</p>
            {dimension.possibleInterests?.length ? (
              <div className="mt-3 text-sm">
                <p className="font-semibold">Posibles intereses</p>
                <ul className="mt-1 list-disc space-y-1 pl-4">
                  {dimension.possibleInterests.map((interest) => (
                    <li key={interest}>{interest}</li>
                  ))}
                </ul>
              </div>
            ) : null}
            <div className="mt-auto pt-4">
              <div className="border-t border-border pt-3">
                {value ? (
                  <p className="flex flex-wrap items-center justify-between gap-2 text-sm">
                    <span>Puntaje</span>
                    <strong className="text-xl">{value.percent} %</strong>
                  </p>
                ) : comparison ? (
                  <div className="space-y-2 text-sm">
                    <p>
                      <span className="font-semibold">Entrada:</span>{' '}
                      {levelLabel(definition, comparison.entry)} · {comparison.entry.percent} %
                    </p>
                    <p>
                      <span className="font-semibold">Salida:</span>{' '}
                      {comparison.exit
                        ? `${levelLabel(definition, comparison.exit)} · ${comparison.exit.percent} %`
                        : 'Cuestionario de salida pendiente'}
                    </p>
                    {comparison.exit && (
                      <Badge variant="outline" className="whitespace-normal">
                        <ChangeLabel value={comparison.label} />
                      </Badge>
                    )}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">Sin puntaje registrado</p>
                )}
              </div>
            </div>
          </Card>
        )
      })}
    </div>
  )
}
