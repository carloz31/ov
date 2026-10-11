import { dimensionIcon } from '@/features/student-tracking/lib/presentation'

import { Alert, AlertDescription } from '@/components/ui/Alert'
import { Badge } from '@/components/ui/Badge'

import { highlightedDimensions, interestCode, isFlatProfile } from '@/features/student-tracking/lib/selectors'

import { ColoredProgress } from '@/features/student-tracking/components/ColoredProgress'
import { EmptyMessage } from '@/features/student-tracking/components/EmptyMessage'

import { QuestionnaireComparison } from '@/features/student-tracking/components/QuestionnaireComparison'
import type { QuestionnaireDefinition, QuestionnaireResult } from '@/types/studentProfile'

export function QuestionnaireBars({
  definition,
  result,
  expanded = false,
  audience = 'counselor',
  childName = 'tu hijo',
}: {
  definition: QuestionnaireDefinition
  result: QuestionnaireResult
  expanded?: boolean
  audience?: 'counselor' | 'parent'
  childName?: string
}) {
  const highlighted = result.kind === 'highlights' ? highlightedDimensions(result.values) : []
  const code = result.kind === 'interests' ? interestCode(result.values, definition.dimensions) : []
  if (result.kind === 'comparison') return <QuestionnaireComparison definition={definition} result={result} />
  if (!result.values.length) return <EmptyMessage>Sin resultados registrados.</EmptyMessage>
  const featured = definition.dimensions.filter((dimension) => highlighted.includes(dimension.id))
  const featuredLabel = featured.length === 1 ? 'Dimensión destacada' : 'Dimensiones destacadas'
  return (
    <div className={expanded ? 'space-y-5 text-lg [&_[data-slot=progress]]:h-3' : 'space-y-4'}>
      {definition.dimensions.map((dimension) => {
        const Icon = dimensionIcon(dimension.id)
        const value = result.values.find((item) => item.dimensionId === dimension.id)
        if (!value) return null
        return (
          <div key={dimension.id} className="space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="flex flex-wrap items-center gap-2 font-medium">
                <Icon className="size-4 shrink-0 text-primary" aria-hidden />
                {dimension.name}
                {highlighted.includes(dimension.id) && <Badge variant="secondary">Destacada</Badge>}
              </h3>
              <span>{value.percent} %</span>
            </div>
            <ColoredProgress
              label={`${dimension.name}: ${value.percent} %`}
              value={value.percent}
              tone={
                highlighted.includes(dimension.id) || code.includes(dimension.id) ? 'primary' : 'secondary'
              }
            />
          </div>
        )
      })}
      {result.kind === 'highlights' && featured.length > 0 && (
        <section className="rounded-xl border border-border bg-card p-4 sm:p-5" aria-label={featuredLabel}>
          <h3 className="text-base font-semibold">{featuredLabel}</h3>
          <p className={`${expanded ? 'text-3xl sm:text-4xl' : 'text-2xl'} mt-2 font-bold text-primary`}>
            {featured.map((dimension) => dimension.name).join(' · ')}
          </p>
          {featured.length > 1 && (
            <p className="mt-2 text-sm text-muted-foreground">
              {featured.length === definition.dimensions.length
                ? 'Todas las dimensiones tienen el mismo puntaje; no hay una única dimensión destacada.'
                : 'Empate en el puntaje más alto.'}
            </p>
          )}
        </section>
      )}
      {result.kind === 'interests' &&
        (isFlatProfile(result.values) ? (
          <Alert className="border-border bg-muted">
            <AlertDescription>
              {audience === 'parent'
                ? `Sus respuestas fueron muy parejas entre áreas. Es una buena oportunidad para conversar con ${childName} sobre qué actividades disfruta más.`
                : 'Perfil plano: sus respuestas fueron muy parejas entre dimensiones. No se generó un código de interés ni ocupaciones afines.'}
            </AlertDescription>
          </Alert>
        ) : (
          <section
            className="rounded-xl border border-border bg-card p-4 sm:p-5"
            aria-label="Código de interés"
          >
            <h3 className="text-base font-semibold">Código de interés</h3>
            <p
              className={`${expanded ? 'text-4xl' : 'text-3xl'} mt-2 font-bold tracking-widest text-foreground`}
            >
              {code.join('')}
            </p>
            <p className="mt-2 text-sm">
              {code.map((id) => definition.dimensions.find((d) => d.id === id)?.name).join(' · ')}
            </p>
          </section>
        ))}
    </div>
  )
}
