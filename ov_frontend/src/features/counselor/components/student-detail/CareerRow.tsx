import { Eye, MoreHorizontal } from 'lucide-react'

import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/DropdownMenu'

import { getCardParts } from '@/features/counselor/lib/counselorPortalSelectors'

import type { CareerCardPart, Interest } from '@/features/counselor/types'
import { CardPartStatus } from '@/features/counselor/components/student-detail/CardPartStatus'

export function CareerRow({
  interest,
  onView,
}: {
  interest: Interest
  onView: (interest: Interest) => void
}) {
  const parts = getCardParts(interest)
  const partKeys: CareerCardPart[] = ['motivation', 'influences', 'knowledge', 'preparations', 'budgets']
  const match =
    interest.riasecMatch === 'GREAT'
      ? ['Excelente', 'neutral']
      : interest.riasecMatch === 'GOOD'
        ? ['Bueno', 'neutral']
        : ['Bajo', 'outline']
  return (
    <tr>
      <td className="p-4 font-medium">{interest.name}</td>
      <td>{new Date(interest.addedAt).toLocaleDateString('es-PE')}</td>
      <td>
        <Badge variant="outline">{interest.riasecCode ?? '—'}</Badge>
      </td>
      <td>
        <Badge variant={match[1] as 'default' | 'neutral' | 'outline'}>{match[0]}</Badge>
      </td>
      {parts.map((done, index) => (
        <td key={partKeys[index]}>
          <CardPartStatus
            complete={done}
            partial={interest.partialCardParts?.includes(partKeys[index]) ?? false}
          />
        </td>
      ))}
      <td className="text-center">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button aria-label={`Acciones para ${interest.name}`} size="icon" variant="ghost">
              <MoreHorizontal />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onSelect={() => onView(interest)}>
              <Eye /> Ver ficha
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </td>
    </tr>
  )
}
