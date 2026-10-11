import { TrendingDown, TrendingUp } from 'lucide-react'

import { cn } from '@/lib/utils'

export function Delta({ value }: { value?: number }) {
  if (value === undefined) return <span className="text-muted-foreground">—</span>
  if (Math.abs(value) < 0.05) return <span className="text-muted-foreground">= 0.0</span>
  const UpIcon = value > 0 ? TrendingUp : TrendingDown
  return (
    <span className={cn('inline-flex items-center gap-1 font-semibold', 'text-muted-foreground')}>
      <UpIcon className="size-4" /> {Math.abs(value).toFixed(1)}
    </span>
  )
}
