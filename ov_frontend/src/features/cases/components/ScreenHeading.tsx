import { Flame } from 'lucide-react'
import { Badge } from '@/components/ui/Badge'
import { cn } from '@/lib/utils'
export function ScreenHeading({
  badge,
  description,
  inverse = false,
  title,
}: {
  badge: string
  description: string
  inverse?: boolean
  title: string
}) {
  return (
    <section className={cn('mb-7', inverse && 'text-white')}>
      <Badge
        className={cn('mb-3', inverse && 'border border-white/12 bg-white/10 text-white')}
        variant="default"
      >
        <Flame className="size-3.5" /> {badge}
      </Badge>
      <h1 className="text-3xl font-black tracking-[-0.03em] sm:text-4xl">{title}</h1>
      <p
        className={cn(
          'mt-3 max-w-3xl text-base leading-7',
          inverse ? 'text-white/65' : 'text-muted-foreground',
        )}
      >
        {description}
      </p>
    </section>
  )
}
