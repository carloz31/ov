import { Link } from 'react-router'

import { Button } from '@/components/ui/Button'

import { prioritiesPath } from '@/features/student-tracking/lib/navigation'

export function PriorityLink({ returnTo }: { returnTo?: string }) {
  return (
    <Button
      asChild
      variant="link"
      className="min-h-11 h-auto max-w-full justify-start px-0 text-left whitespace-normal"
    >
      <Link to={`${prioritiesPath}${returnTo ? `?${new URLSearchParams({ returnTo })}` : ''}`}>
        Ver configuración de prioritarios
      </Link>
    </Button>
  )
}
