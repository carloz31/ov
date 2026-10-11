import { Alert, AlertDescription } from '@/components/ui/Alert'
import { Card } from '@/components/ui/Card'
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/Table'
import { ChangeLabel } from '@/features/student-tracking/components/ChangeLabel'
import { EmptyMessage } from '@/features/student-tracking/components/EmptyMessage'
import { changes, levelLabel } from '../lib/selectors'
import type { DimensionValue, QuestionnaireDefinition, QuestionnaireResult } from '@/types/studentProfile'

export function QuestionnaireComparison({
  definition,
  result,
}: {
  definition: QuestionnaireDefinition
  result: Extract<QuestionnaireResult, { kind: 'comparison' }>
}) {
  const comparisons = changes(result)
  const rows = definition.dimensions.flatMap((dimension) => {
    const comparison = comparisons.find((row) => row.dimensionId === dimension.id)
    return comparison ? [{ ...comparison, name: dimension.name }] : []
  })
  if (!rows.length) return <EmptyMessage>Sin resultados registrados.</EmptyMessage>

  const score = (value: DimensionValue | undefined) =>
    value ? (
      <span className="block space-y-1">
        {value.level !== undefined && <span className="block">{levelLabel(definition, value)}</span>}
        <span className="block font-semibold">{value.percent} %</span>
      </span>
    ) : (
      <span className="text-muted-foreground">Pendiente</span>
    )
  const change = (row: (typeof rows)[number]) =>
    row.exit ? <ChangeLabel value={row.label} /> : <span className="text-muted-foreground">Pendiente</span>

  return (
    <div className="space-y-4">
      {rows.some((row) => !row.exit) && (
        <Alert className="bg-muted/50">
          <AlertDescription>Cuestionario de salida pendiente</AlertDescription>
        </Alert>
      )}
      <div className="hidden md:block">
        <Table className="table-fixed [&_th:first-child]:pl-4 [&_td:first-child]:pl-4 [&_th:last-child]:pr-4 [&_td:last-child]:pr-4">
          <TableCaption className="sr-only">Comparación de resultados de entrada y salida</TableCaption>
          <TableHeader className="bg-muted">
            <TableRow>
              <TableHead scope="col" className="w-[34%] text-sm font-semibold">
                Dimensión
              </TableHead>
              <TableHead scope="col" className="w-[22%] text-sm font-semibold">
                Entrada
              </TableHead>
              <TableHead scope="col" className="w-[22%] text-sm font-semibold">
                Salida
              </TableHead>
              <TableHead scope="col" className="w-[22%] text-sm font-semibold">
                Cambio
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row) => (
              <TableRow key={row.dimensionId}>
                <TableHead scope="row" className="p-4 text-sm font-medium text-foreground">
                  {row.name}
                </TableHead>
                <TableCell className="text-muted-foreground">{score(row.entry)}</TableCell>
                <TableCell className="text-primary">{score(row.exit)}</TableCell>
                <TableCell>{change(row)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      <div className="space-y-3 md:hidden">
        {rows.map((row) => (
          <Card key={row.dimensionId} className="min-w-0 gap-3 rounded-xl p-4">
            <h3 className="font-semibold">{row.name}</h3>
            <dl className="grid grid-cols-2 gap-4 text-sm">
              <div className="min-w-0">
                <dt className="mb-1 font-medium">Entrada</dt>
                <dd className="text-muted-foreground">{score(row.entry)}</dd>
              </div>
              <div className="min-w-0">
                <dt className="mb-1 font-medium">Salida</dt>
                <dd className="text-primary">{score(row.exit)}</dd>
              </div>
              <div className="col-span-2">
                <dt className="mb-1 font-medium">Cambio</dt>
                <dd>{change(row)}</dd>
              </div>
            </dl>
          </Card>
        ))}
      </div>
    </div>
  )
}
