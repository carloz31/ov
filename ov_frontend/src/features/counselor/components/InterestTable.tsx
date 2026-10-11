import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/Table'
import type { interestTop } from '@/features/counselor/lib/classroomSelectors'

export function InterestTable({
  rows,
  total,
  institutions = false,
}: {
  rows: ReturnType<typeof interestTop>
  total: number
  institutions?: boolean
}) {
  if (!rows.length)
    return (
      <p className="text-sm text-muted-foreground">
        Todavía no hay {institutions ? 'instituciones' : 'carreras'} en planes o favoritas.
      </p>
    )
  return (
    <Table className="table-fixed text-sm [&_th]:h-10 [&_th]:px-1 [&_th]:font-semibold [&_td]:px-1 [&_td]:py-3 [&_th:first-child]:pl-0 [&_td:first-child]:pl-0 [&_th:last-child]:pr-0 [&_td:last-child]:pr-0">
      <TableHeader>
        <TableRow>
          <TableHead className="w-5">
            <span className="sr-only">Posición</span>#
          </TableHead>
          <TableHead>{institutions ? 'Institución' : 'Carrera'}</TableHead>
          <TableHead className={institutions ? 'w-14 text-center' : 'w-20 text-center'}>En planes</TableHead>
          <TableHead className="w-14 text-center">Favorita</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((row, i) => (
          <TableRow key={row.id}>
            <TableCell className="text-muted-foreground">{i + 1}</TableCell>
            <TableCell className="break-words">
              <span title={row.name} aria-label={row.name}>
                {row.shortName ?? row.name}
              </span>
            </TableCell>
            <TableCell className="relative text-center">
              <span
                className="absolute inset-y-2 left-0 rounded bg-primary-soft"
                style={{ width: `${total ? (row.plans / total) * 100 : 0}%` }}
                aria-hidden
              />
              <span className="relative">
                {row.plans}
                {row.planA !== undefined && (
                  <span className="block mt-1 text-xs leading-4 text-muted-foreground">
                    ({row.planA} plan A)
                  </span>
                )}
              </span>
            </TableCell>
            <TableCell className="text-center">{row.favorites}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}
