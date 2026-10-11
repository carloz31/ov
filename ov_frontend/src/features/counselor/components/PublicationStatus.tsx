import { Badge } from '@/components/ui/Badge'

import type { Interview } from '@/features/counselor/types'

import type { usePublications } from '@/features/counselor/hooks/usePublications'
export function PublicationStatus({
  model,
  item,
}: {
  model: ReturnType<typeof usePublications>
  item: Interview
}) {
  const { reports } = model
  return (
    <div className="flex flex-wrap justify-center gap-2">
      {reports(item).length > 0 && <Badge variant="aviso">Reportado</Badge>}
      {item.hidden ? (
        <Badge variant="secondary">Ocultada</Badge>
      ) : item.featured ? (
        <Badge variant="secondary">Destacada</Badge>
      ) : (
        <Badge variant="outline">Sin destacar</Badge>
      )}
    </div>
  )
}
