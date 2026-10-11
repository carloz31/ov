import { usePublications } from '@/features/counselor/hooks/usePublications'
import { PublicationOpenButton } from '@/features/counselor/components/PublicationOpenButton'
import { PublicationStatus } from '@/features/counselor/components/PublicationStatus'

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/Table'

export function PublicationTable({ model }: { model: ReturnType<typeof usePublications> }) {
  const { headers, visible, classroom, profession, comments, date } = model
  return (
    <div className="hidden xl:block">
      <Table className="table-fixed text-base [&_th:first-child]:pl-2.5 [&_td:first-child]:pl-2.5 [&_th:last-child]:pr-2.5 [&_td:last-child]:pr-2.5">
        <TableHeader className="bg-muted">
          <TableRow className="hover:bg-transparent">
            {headers.map((header, index) => (
              <TableHead
                key={header}
                scope="col"
                className={`px-2.5 py-2.5 text-base font-semibold whitespace-normal text-muted-foreground ${index >= 3 ? 'text-center' : ''} ${index === 0 ? 'w-[20%]' : index === 1 ? 'w-[8%]' : index === 2 ? 'w-[20%]' : index === 6 ? 'w-[16%]' : 'w-[12%]'}`}
              >
                {header}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {visible.map((item) => (
            <TableRow key={item.id} className="hover:bg-transparent">
              <TableCell className="px-2.5 py-3 whitespace-normal break-words">
                {item.authors.filter(Boolean).join(', ')}
              </TableCell>
              <TableCell className="px-2.5 py-3 whitespace-normal">{classroom(item)}</TableCell>
              <TableCell className="px-2.5 py-3 whitespace-normal break-words">{profession(item)}</TableCell>
              <TableCell className="px-2.5 py-3 text-center">{date(item)}</TableCell>
              <TableCell className="px-2.5 py-3 text-center">{comments(item)}</TableCell>
              <TableCell className="px-2.5 py-3">{<PublicationStatus model={model} item={item} />}</TableCell>
              <TableCell className="px-2.5 py-3 text-center">
                {<PublicationOpenButton model={model} item={item} />}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
