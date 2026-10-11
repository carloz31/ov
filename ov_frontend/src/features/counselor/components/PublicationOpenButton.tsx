import { Eye } from 'lucide-react'

import { Link } from 'react-router'

import { Button } from '@/components/ui/Button'

import type { Interview } from '@/features/counselor/types'

import type { usePublications } from '@/features/counselor/hooks/usePublications'
export function PublicationOpenButton({
  model,
  item,
}: {
  model: ReturnType<typeof usePublications>
  item: Interview
}) {
  const { query } = model
  return (
    <Button asChild variant="outline" className="min-h-11 whitespace-normal">
      <Link to={`/counselor/publications/interviews/${encodeURIComponent(item.id)}${query}`}>
        <Eye className="size-4 shrink-0" /> Ver entrevista
      </Link>
    </Button>
  )
}
