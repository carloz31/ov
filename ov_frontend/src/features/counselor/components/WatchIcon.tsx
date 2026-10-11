import { Eye } from 'lucide-react'

import { cn } from '@/lib/utils'

export function WatchIcon({ active }: { active: boolean }) {
  return <Eye className={cn('size-4', active ? 'text-primary' : 'text-muted-foreground')} />
}
